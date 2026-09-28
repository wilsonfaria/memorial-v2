// OCR-revision pilot: runs a few newspaper pages through free hosted vision
// models (NVIDIA, Google Gemini or Groq — all via their OpenAI-compatible
// APIs) and writes a side-by-side HTML report — page image, original OCR, and
// each model's transcription — so quality can be judged before processing the
// whole archive. Nothing is written to the database.
//
//   npx tsx scripts/ocr-pilot.ts --list-models=gemini        (nvidia | gemini | groq)
//   npx tsx scripts/ocr-pilot.ts --pages=6 --out=gemini --vision=gemini:gemini-3.8-flash
//   npx tsx scripts/ocr-pilot.ts --vision=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning,groq:qwen/qwen3.8-27b
//
// Keys in .env: NVIDIA_API_KEY, GEMINI_API_KEY, GROQ_API_KEY (only the ones
// used). Output: ../piloto-ocr/<out>/relatorio.html
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { absolutePdfPath } from "../src/lib/storage";
import { renderPdfPageTilesToJpeg } from "../src/lib/pdf-render";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

// --out=<subfolder> keeps concurrent/successive rounds from overwriting each other.
const OUT_DIR = path.resolve(process.cwd(), "..", "piloto-ocr", arg("out") ?? "");

/**
 * All three providers speak the OpenAI chat-completions format; they differ in
 * base URL, key and how "thinking" is controlled. Model specs look like
 * "gemini:gemini-3.8-flash", "groq:qwen/qwen3.8-27b", or a bare NVIDIA id.
 */
type Provider = { base: string; keyEnv: string; extra: Record<string, unknown> };
const PROVIDERS: Record<string, Provider> = {
  // Nemotron's card reports OCR scores with reasoning off.
  nvidia: {
    base: "https://integrate.api.nvidia.com/v1",
    keyEnv: "NVIDIA_API_KEY",
    extra: { chat_template_kwargs: { enable_thinking: false } },
  },
  // Gemini 3 reasoning can't be turned off, only lowered.
  gemini: {
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    extra: { reasoning_effort: "low" },
  },
  groq: { base: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", extra: {} },
};

function resolveModel(spec: string): { provider: Provider; model: string; key: string } {
  const [prefix, ...rest] = spec.split(":");
  const provider = rest.length ? PROVIDERS[prefix] : PROVIDERS.nvidia;
  if (!provider) throw new Error(`Provedor desconhecido em "${spec}" (use nvidia, gemini ou groq).`);
  const key = process.env[provider.keyEnv];
  if (!key) throw new Error(`Defina ${provider.keyEnv} no .env para usar "${spec}".`);
  return { provider, model: rest.length ? rest.join(":") : spec, key };
}
const PAGES = Number(arg("pages") ?? 6);
// Vision models to compare (comma-separated). Round 1 showed text-only
// correction of the old OCR doesn't work (nothing to recover from without
// the image), so it only runs when --text=<model> is given explicitly.
const VISION_MODELS = (arg("vision") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning").split(",");
const TEXT_MODEL = arg("text");

// Plain-text format instead of JSON: round 1 showed smaller models read the
// page fine but garble nested JSON (misplaced keys, unclosed arrays).
const RULES = `Regras obrigatórias:
- O texto é em PORTUGUÊS antigo. Nunca traduza nenhuma palavra para outro idioma.
- Seja FIEL letra por letra ao que está impresso. Não invente, não complete, não resuma, não comente.
- NÃO modernize a ortografia nem a acentuação. Copie exatamente como impresso, por exemplo:
  "instrucção" (não "instrução"), "collegio" (não "colégio"), "idéa" (não "ideia"), "incumbencia" sem acento
  se estiver sem acento, "nella", "taes", "annunciado", "Piumhy", "sôbre", "pharmacia", "extrail-o".
- Trecho que não dá para ler: escreva [ilegível]. Palavra de leitura duvidosa: escreva a palavra seguida de [?].
- Junte palavras hifenizadas na quebra de linha ("abasteci- mento" → "abastecimento").
- Siga a ordem de leitura: cada coluna de cima para baixo, da esquerda para a direita; cada matéria inteira antes da próxima.
- Anúncios e tabelas: transcreva o texto que houver, em linhas simples.
Formato da resposta (texto simples, sem JSON, sem markdown além disto):
### Título da matéria (ou ### sem título)
texto da matéria

### Título da próxima matéria
texto...
Se houver problemas de leitura, termine com uma linha: OBS: descrição.`;

type Usage = { prompt_tokens?: number; completion_tokens?: number };
type Result = { model: string; mode: string; ms: number; usage: Usage; raw: string; parsed: unknown; error?: string };

const MAX_ATTEMPTS = 6;

async function chat(spec: string, messages: unknown[], maxTokens = 8192): Promise<{ text: string; usage: Usage }> {
  const { provider, model, key } = resolveModel(spec);
  for (let attempt = 1; ; attempt++) {
    const retry = async (why: string) => {
      const wait = 15000 * attempt;
      console.log(`    ${why} — nova tentativa em ${wait / 1000}s (${attempt}/${MAX_ATTEMPTS - 1})`);
      await new Promise((r) => setTimeout(r, wait));
    };
    let res: Response;
    try {
      res = await fetch(`${provider.base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
          stream: false,
          ...provider.extra,
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (err) {
      // Timeouts / dropped connections from an overloaded free endpoint.
      if (attempt < MAX_ATTEMPTS) {
        await retry(`falha de rede (${(err as Error).message})`);
        continue;
      }
      throw err;
    }
    // 429 = our rate limit; 503 "ResourceExhausted … (16/16)" = the shared
    // free worker is full. Both are transient.
    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      await retry(`servidor ocupado (HTTP ${res.status})`);
      continue;
    }
    if (!res.ok) throw new Error(`${spec} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[]; usage?: Usage };
    // Reasoning models may still prepend <think>…</think>; keep only the answer.
    const text = (data.choices[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return { text, usage: data.usage ?? {} };
  }
}

/** Parses the "### Título\ntexto…" plain-text format (plus an optional final "OBS:" line). */
function parseArticles(text: string): { materias: { titulo: string; texto: string }[]; observacoes?: string } | null {
  const clean = text.replace(/^```\w*\n?|```$/gm, "").trim();
  const obsMatch = clean.match(/\n\s*OBS:\s*([\s\S]*)$/);
  const body = obsMatch ? clean.slice(0, obsMatch.index) : clean;
  const materias = body
    .split(/^###\s*/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [first, ...rest] = chunk.split("\n");
      return { titulo: first.trim().replace(/^sem título$/i, ""), texto: rest.join("\n").trim() };
    });
  return materias.length ? { materias, observacoes: obsMatch?.[1].trim() } : null;
}

async function run(model: string, mode: string, messages: unknown[]): Promise<Result> {
  const t = Date.now();
  try {
    const { text, usage } = await chat(model, messages);
    return { model, mode, ms: Date.now() - t, usage, raw: text, parsed: parseArticles(text) };
  } catch (err) {
    return { model, mode, ms: Date.now() - t, usage: {}, raw: "", parsed: null, error: (err as Error).message };
  }
}

async function listModels(providerName: string) {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Provedor desconhecido: ${providerName}`);
  const res = await fetch(`${provider.base}/models`, {
    headers: { Authorization: `Bearer ${process.env[provider.keyEnv]}` },
  });
  if (!res.ok) throw new Error(`${providerName} /models → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { data: { id: string }[] };
  const ids = data.data.map((m) => m.id).sort();
  console.log(`${ids.length} modelos. Candidatos (visão / documentos / texto grande):`);
  for (const id of ids.filter((i) => /vl|vision|parse|ocr|nemotron|deepseek|qwen|llama-4|gemma|kimi|glm/i.test(i))) console.log("  " + id);
}

/** One page per decade (then any), spread across page numbers. */
async function pickPages(n: number) {
  const decades = await prisma.decade.findMany({ orderBy: { startYear: "asc" }, select: { startYear: true } });
  const picks: { editionId: number; page: number; pdfPath: string; date: Date; text: string }[] = [];
  for (let i = 0; picks.length < n && i < n * 3; i++) {
    const decade = decades[i % decades.length].startYear;
    const skip = Math.floor(i / decades.length) * 7 + 3;
    const row = await prisma.editionPage.findFirst({
      where: {
        edition: { deletedAt: null, month: { year: { decade: { startYear: decade } } } },
        page: (i % 4) + 1,
        NOT: { editionId: { in: picks.map((p) => p.editionId) } },
      },
      include: { edition: { select: { pdfPath: true, publishedAt: true } } },
      orderBy: { editionId: "asc" },
      skip,
    });
    if (row) picks.push({ editionId: row.editionId, page: row.page, pdfPath: row.edition.pdfPath, date: row.edition.publishedAt, text: row.text });
  }
  return picks;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderResult(r: Result): string {
  const tokens = r.usage.prompt_tokens != null ? ` · ${r.usage.prompt_tokens}+${r.usage.completion_tokens} tokens` : "";
  const head = `<h4>${esc(r.mode)} — <code>${esc(r.model)}</code> <small>${(r.ms / 1000).toFixed(1)}s${tokens}</small></h4>`;
  if (r.error) return `${head}<p class="err">${esc(r.error)}</p>`;
  const p = r.parsed as { materias?: { titulo?: string; texto?: string }[]; observacoes?: string } | null;
  if (!p?.materias) return `${head}<p class="err">Resposta fora do formato pedido:</p><pre>${esc(r.raw)}</pre>`;
  const body = p.materias
    .map((m) => `${m.titulo ? `<b>${esc(m.titulo)}</b><br>` : ""}${esc(m.texto ?? "").replace(/\[ilegível\]|\[\?\]/g, (x) => `<mark>${x}</mark>`)}`)
    .join("<hr>");
  return `${head}<div class="txt">${body}</div>${p.observacoes ? `<p class="obs">Obs.: ${esc(p.observacoes)}</p>` : ""}`;
}

async function main() {
  const listFor = process.argv.find((a) => a.startsWith("--list-models"));
  if (listFor) return listModels(listFor.split("=")[1] ?? "nvidia");
  for (const spec of [...VISION_MODELS, ...(TEXT_MODEL ? [TEXT_MODEL] : [])]) resolveModel(spec); // fail fast on missing keys

  mkdirSync(OUT_DIR, { recursive: true });
  const pages = await pickPages(PAGES);
  const sections: string[] = [];
  const all: unknown[] = [];

  for (const [idx, pg] of pages.entries()) {
    const label = `Edição ${pg.editionId}, pág. ${pg.page} (${pg.date.toISOString().slice(0, 10)})`;
    console.log(`[${idx + 1}/${pages.length}] ${label}`);
    const { tiles } = await renderPdfPageTilesToJpeg(readFileSync(absolutePdfPath(pg.pdfPath)), pg.page, {
      width: 1536,
      maxTileHeight: 1100,
    });
    const imgFiles = tiles.map((b, i) => {
      const f = `ed${pg.editionId}-p${pg.page}-f${i + 1}.jpg`;
      writeFileSync(path.join(OUT_DIR, f), b);
      return f;
    });

    const results: Result[] = [];

    // A) Vision: each model transcribes each band from the image alone (one
    // image per request — Nemotron Omni's limit).
    for (const model of VISION_MODELS) {
      for (const [i, tile] of tiles.entries()) {
        console.log(`    ${model}: faixa ${i + 1}/${tiles.length}`);
        results.push(
          await run(model, `Imagem · faixa ${i + 1}`, [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Esta imagem é uma faixa horizontal de uma página do jornal "Alto São Francisco" (Piumhi, MG), digitalizado. Transcreva todo o texto impresso visível na faixa. Linhas cortadas na borda de cima ou de baixo podem ser ignoradas.\n\n${RULES}`,
                },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${tile.toString("base64")}` } },
              ],
            },
          ])
        );
      }
    }

    // B) Text-only: clean up the existing OCR text (only with --text=<model>).
    if (TEXT_MODEL) {
      console.log("    texto: corrigindo o OCR existente");
      results.push(
        await run(TEXT_MODEL, "B · correção do OCR (sem imagem)", [
          {
            role: "user",
            content: `Abaixo está o texto de OCR, com muitos erros, de uma página do jornal "Alto São Francisco" (Piumhi, MG), das décadas de 1920 a 1950. Corrija os erros de reconhecimento (letras trocadas, palavras partidas, símbolos espúrios) e separe as matérias. Não reescreva o conteúdo.\n\n${RULES}\n\nTEXTO DO OCR:\n${pg.text}`,
          },
        ])
      );
    }

    all.push({ ...pg, text: undefined, images: imgFiles, results });
    sections.push(`<section>
<h2>${esc(label)}</h2>
<div class="grid">
  <div><h3>Imagem da página</h3>${imgFiles.map((f) => `<img src="${f}">`).join("")}</div>
  <div><h3>OCR original</h3><div class="txt ocr">${esc(pg.text)}</div></div>
  ${[...new Set(results.map((r) => r.model))]
    .map((m) => `<div><h3><code>${esc(m.split("/").pop()!)}</code></h3>${results.filter((r) => r.model === m).map(renderResult).join("")}</div>`)
    .join("")}
</div></section>`);
  }

  writeFileSync(path.join(OUT_DIR, "resultados.json"), JSON.stringify(all, null, 2));
  writeFileSync(
    path.join(OUT_DIR, "relatorio.html"),
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Piloto de revisão de OCR</title>
<style>
body{font-family:system-ui,sans-serif;margin:16px;background:#f6f5f1;color:#222}
h1{font-size:20px}h2{font-size:16px;margin-top:32px;border-top:2px solid #999;padding-top:8px}
h3{font-size:13px;margin:0 0 6px}h4{font-size:12px;margin:10px 0 4px}small{color:#777;font-weight:normal}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;align-items:start}
.grid>div{background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px;max-height:1100px;overflow:auto}
img{width:100%;display:block;margin-bottom:4px}
.txt{font-family:Georgia,serif;font-size:13px;line-height:1.5;white-space:pre-wrap}
.ocr{color:#555}mark{background:#ffe08a}.err{color:#b00}.obs{font-size:12px;color:#666}
hr{border:0;border-top:1px dashed #ccc}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style>
<h1>Piloto de revisão de OCR — ${pages.length} páginas</h1>
<p>Transcrição a partir da imagem, faixa por faixa: ${VISION_MODELS.map((m) => `<code>${esc(m)}</code>`).join(" · ")}${TEXT_MODEL ? ` · correção do OCR sem imagem: <code>${esc(TEXT_MODEL)}</code>` : ""}. Em amarelo: trechos que o modelo marcou como ilegíveis ou duvidosos.</p>
${sections.join("\n")}`
  );
  console.log(`\nRelatório: ${path.join(OUT_DIR, "relatorio.html")}`);
}

main()
  .catch((err) => {
    console.error("ERRO:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
