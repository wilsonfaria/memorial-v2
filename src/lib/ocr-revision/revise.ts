import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";
import { renderPdfPageTilesToJpeg } from "@/lib/pdf-render";
import { reindexFromDatabase } from "@/lib/search/indexer";
import { DailyQuotaError, transcribeImage } from "@/lib/ocr-revision/gemini";
import { reflowText } from "@/lib/ocr-revision/reflow";

/**
 * AI transcription of newspaper pages from their images. Each page is
 * rendered in horizontal bands (a whole page in one image leaves the print
 * too small), each band is transcribed, and the result is stored in
 * edition_pages.revisedText — the original OCR text is never touched.
 * Validated in scripts/ocr-pilot.ts: gemini-3.8-flash kept the period
 * spelling ("instrucção", "idéa", "Collegio") where other free models
 * modernized it or slipped into English.
 */

export const INSTRUCTIONS = `Esta imagem é uma faixa horizontal de uma página do jornal "Alto São Francisco" (Piumhi, MG), digitalizado. Transcreva todo o texto impresso visível na faixa. Linhas cortadas na borda de cima ou de baixo podem ser ignoradas.

Regras obrigatórias:
- O texto é em PORTUGUÊS antigo. Nunca traduza nenhuma palavra para outro idioma.
- Seja FIEL letra por letra ao que está impresso. Não invente, não complete, não resuma, não comente.
- NÃO modernize a ortografia nem a acentuação. Copie exatamente como impresso, por exemplo:
  "instrucção" (não "instrução"), "collegio" (não "colégio"), "idéa" (não "ideia"), "incumbencia" sem acento
  se estiver sem acento, "nella", "taes", "annunciado", "Piumhy", "sôbre", "pharmacia", "extrail-o".
- Trecho que não dá para ler: escreva [ilegível]. Palavra de leitura duvidosa: escreva a palavra seguida de [?].
- NÃO reproduza as quebras de linha das colunas: escreva cada parágrafo corrido, numa linha só, e junte as palavras hifenizadas na quebra ("abasteci- mento" → "abastecimento"). Quebre a linha só entre parágrafos, itens de lista e linhas de anúncio.
- Siga a ordem de leitura: cada coluna de cima para baixo, da esquerda para a direita; cada matéria inteira antes da próxima.
- Anúncios e tabelas: transcreva o texto que houver, em linhas simples.
Formato da resposta (texto simples, sem JSON, sem markdown além disto):
### Título da matéria (ou ### sem título)
texto da matéria

### Título da próxima matéria
texto...
Se houver problemas de leitura, termine com uma linha: OBS: descrição.`;

/** Drops code fences and the trailing "OBS:" note; keeps the "### título" article format. */
function cleanBand(text: string): string {
  return text
    .replace(/^```\w*\n?|```$/gm, "")
    .replace(/\n\s*OBS:[\s\S]*$/, "")
    .trim();
}

export type RevisePageResult = { editionId: number; page: number; chars: number; bands: number };

/** Transcribes one page and stores it. Throws DailyQuotaError when today's free quota is used up. */
export async function revisePage(editionId: number, page: number): Promise<RevisePageResult> {
  const edition = await prisma.edition.findUniqueOrThrow({ where: { id: editionId }, select: { pdfPath: true } });
  const pdf = await readFile(absolutePdfPath(edition.pdfPath));
  const { tiles } = await renderPdfPageTilesToJpeg(pdf, page, { width: 1536, maxTileHeight: 1100 });

  const bands: string[] = [];
  const models = new Set<string>();
  for (const tile of tiles) {
    const r = await transcribeImage(tile, INSTRUCTIONS);
    bands.push(reflowText(cleanBand(r.text)));
    models.add(r.model);
  }
  const revisedText = bands.filter(Boolean).join("\n\n");
  if (!revisedText) throw new Error("O modelo não devolveu texto para esta página.");

  const revisedModel = [...models].join(", "); // two when a quota ran out mid-page
  await prisma.$transaction([
    prisma.editionPage.update({
      where: { editionId_page: { editionId, page } },
      data: { revisedText, revisedModel, revisedAt: new Date(), revisionError: null },
    }),
    prisma.pageTextVersion.create({ data: { editionId, page, text: revisedText, source: "ai", model: revisedModel } }),
  ]);
  await reindexFromDatabase([editionId]);
  return { editionId, page, chars: revisedText.length, bands: tiles.length };
}

export type ReviseNextResult =
  | { status: "revised"; result: RevisePageResult; remaining: number }
  | { status: "failed"; editionId: number; page: number; error: string; remaining: number }
  | { status: "quota"; message: string; remaining: number }
  | { status: "done"; remaining: 0 };

const pendingWhere = (retryFailed: boolean) => ({
  revisedAt: null,
  ...(retryFailed ? {} : { revisionError: null }),
  edition: { deletedAt: null },
});

/**
 * Revises the next pending page (oldest edition id first). Failed pages are
 * marked and skipped so one bad PDF can't block the queue; pass retryFailed
 * to give them another go.
 */
export async function reviseNextPage({ retryFailed = false } = {}): Promise<ReviseNextResult> {
  const next = await prisma.editionPage.findFirst({
    where: pendingWhere(retryFailed),
    orderBy: [{ editionId: "asc" }, { page: "asc" }],
    select: { editionId: true, page: true },
  });
  if (!next) return { status: "done", remaining: 0 };

  const remainingAfter = async () => Math.max(0, (await prisma.editionPage.count({ where: pendingWhere(retryFailed) })));
  try {
    const result = await revisePage(next.editionId, next.page);
    return { status: "revised", result, remaining: await remainingAfter() };
  } catch (err) {
    if (err instanceof DailyQuotaError) {
      return { status: "quota", message: err.message, remaining: await remainingAfter() };
    }
    const error = (err as Error).message.slice(0, 1000);
    await prisma.editionPage.update({
      where: { editionId_page: { editionId: next.editionId, page: next.page } },
      data: { revisionError: error },
    });
    return { status: "failed", editionId: next.editionId, page: next.page, error, remaining: await remainingAfter() };
  }
}

export async function getRevisionStats() {
  const live = { edition: { deletedAt: null } };
  const [total, revised, failed] = await Promise.all([
    prisma.editionPage.count({ where: live }),
    prisma.editionPage.count({ where: { ...live, revisedAt: { not: null } } }),
    prisma.editionPage.count({ where: { ...live, revisedAt: null, revisionError: { not: null } } }),
  ]);
  return { total, revised, failed, pending: total - revised - failed };
}
