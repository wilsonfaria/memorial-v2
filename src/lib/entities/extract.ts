import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { reflowText } from "@/lib/ocr-revision/reflow";
import { DailyQuotaError, generateJson } from "@/lib/ocr-revision/gemini";
import { displayName, entityKey, isUsableName, slugFromKey, splitHonorific } from "@/lib/entities/normalize";
import { ARTICLE_KINDS, type ArticleKind } from "@/lib/entities/kinds";

export { ARTICLE_KINDS, KIND_LABEL, type ArticleKind } from "@/lib/entities/kinds";

/**
 * Structured extraction: turns a page's transcription into articles with a
 * type and a one-line summary, plus the people and places they name. One
 * text-only request per page (see GEMINI_EXTRACT_MODELS). Runs only on
 * transcribed text — raw OCR is too noisy to name people reliably.
 */

const PROMPT = `Você recebe a transcrição de uma página do jornal "Alto São Francisco" (Piumhi, MG), em português antigo, dividida em matérias que começam com "### Título".
Para CADA matéria, na mesma ordem, extraia os dados abaixo. Responda SOMENTE com JSON válido:
{"materias":[{"titulo":"...","tipo":"...","resumo":"...","pessoas":[{"nome":"...","tratamento":"...","papel":"..."}],"lugares":["..."]}]}
Regras:
- "tipo": um de ${ARTICLE_KINDS.join(", ")}.
- "resumo": uma frase curta em português atual dizendo do que trata a matéria.
- "pessoas": só pessoas NOMEADAS no texto (não invente; não inclua "o noivo" sem nome). "nome" exatamente como impresso, SEM o tratamento. "tratamento": o tratamento impresso ("sr.", "d.", "dr.", "cap.", "snrta.", "prof.", "pe.") ou "". "papel": 1 a 3 palavras sobre a pessoa na matéria ("noiva", "falecido", "aniversariante", "viajante", "autor", "proprietário", "pai da noiva") ou "".
- "lugares": cidades, distritos, fazendas, ruas e estabelecimentos citados, como impressos.
- Se uma matéria não tiver pessoas ou lugares, use listas vazias.

Transcrição:
`;

type RawArticle = { titulo?: unknown; tipo?: unknown; resumo?: unknown; pessoas?: unknown; lugares?: unknown };
type ParsedArticle = {
  title: string;
  kind: ArticleKind;
  summary: string;
  people: { surface: string; honorific: string | null; role: string | null }[];
  places: string[];
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates the model's JSON leniently: drops what doesn't fit instead of failing the page. */
export function parseExtraction(json: unknown): ParsedArticle[] {
  const list = (json as { materias?: unknown })?.materias;
  if (!Array.isArray(list)) throw new Error("Resposta sem a lista 'materias'.");
  return (list as RawArticle[]).map((a) => {
    const kind = str(a.tipo, 20).toLowerCase() as ArticleKind;
    const people = (Array.isArray(a.pessoas) ? a.pessoas : [])
      .map((p: { nome?: unknown; tratamento?: unknown; papel?: unknown }) => {
        // The model sometimes leaves the honorific inside the name.
        const split = splitHonorific(str(p?.nome, 200));
        return {
          surface: split.name,
          honorific: str(p?.tratamento, 30) || split.honorific,
          role: str(p?.papel, 100) || null,
        };
      })
      .filter((p) => isUsableName(p.surface));
    const places = (Array.isArray(a.lugares) ? a.lugares : [])
      .map((l) => str(l, 200))
      .filter((l) => isUsableName(l, "place"));
    return {
      title: str(a.titulo, 500) || "Sem título",
      kind: (ARTICLE_KINDS as readonly string[]).includes(kind) ? kind : "outro",
      summary: str(a.resumo, 1000),
      people,
      places: [...new Set(places)],
    };
  });
}

/** Recomputes counts and first/last dates; drops entities left with no mention. */
export async function refreshEntities(ids?: number[]) {
  if (ids && ids.length === 0) return;
  const only = ids ? Prisma.sql`WHERE en.id IN (${Prisma.join([...new Set(ids)])})` : Prisma.empty;
  // One statement instead of one UPDATE per entity (a page can name dozens).
  await prisma.$executeRaw`
    UPDATE entities en
    LEFT JOIN (
      SELECT m.entityId, COUNT(*) AS n, MIN(ed.publishedAt) AS first, MAX(ed.publishedAt) AS last
      FROM entity_mentions m
      JOIN articles a ON a.id = m.articleId
      JOIN editions ed ON ed.id = a.editionId AND ed.deletedAt IS NULL
      GROUP BY m.entityId
    ) s ON s.entityId = en.id
    SET en.mentionCount = COALESCE(s.n, 0), en.firstDate = s.first, en.lastDate = s.last
    ${only}`;
  await prisma.entity.deleteMany({ where: { mentionCount: 0, ...(ids ? { id: { in: ids } } : {}) } });
}

/** Removes a page's articles (e.g. its text is being redone) and updates the entities they named. */
export async function clearPageExtraction(editionId: number, pages?: number[]) {
  const where = { editionId, ...(pages ? { page: { in: pages } } : {}) };
  const touched = await prisma.entityMention.findMany({
    where: { article: where },
    select: { entityId: true },
  });
  await prisma.article.deleteMany({ where });
  await prisma.editionPage.updateMany({ where, data: { entitiesAt: null, entitiesError: null } });
  await refreshEntities(touched.map((t) => t.entityId));
}

async function upsertEntity(kind: "person" | "place", printed: string): Promise<number> {
  const key = entityKey(printed, kind).slice(0, 255);
  const existing = await prisma.entity.findUnique({ where: { kind_key: { kind, key } }, select: { id: true } });
  if (existing) return existing.id;
  const base = slugFromKey(key);
  // The slug is derived from the key, so it's unique too — unless truncated.
  for (let i = 0; ; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    try {
      const e = await prisma.entity.create({ data: { kind, name: displayName(printed).slice(0, 255), key, slug } });
      return e.id;
    } catch (err) {
      const again = await prisma.entity.findUnique({ where: { kind_key: { kind, key } }, select: { id: true } });
      if (again) return again.id; // created concurrently
      if (i > 5) throw err;
    }
  }
}

/**
 * Regroups every mention under the current key rules (normalize.ts) without
 * calling the model again — run it after changing the spelling rules.
 */
export async function rebuildEntityGroups(): Promise<{ mentions: number; entities: number }> {
  const mentions = await prisma.entityMention.findMany({
    select: { id: true, surface: true, entityId: true, entity: { select: { kind: true } } },
  });
  for (const m of mentions) {
    const kind = m.entity.kind as "person" | "place";
    const id = await upsertEntity(kind, m.surface);
    if (id !== m.entityId) await prisma.entityMention.update({ where: { id: m.id }, data: { entityId: id } });
  }
  await refreshEntities();
  // Names stored before displayName() existed.
  for (const e of await prisma.entity.findMany({ select: { id: true, name: true } })) {
    const pretty = displayName(e.name);
    if (pretty !== e.name) await prisma.entity.update({ where: { id: e.id }, data: { name: pretty } });
  }
  return { mentions: mentions.length, entities: await prisma.entity.count() };
}

export type ExtractPageResult = { articles: number; people: number; places: number; model: string };

/** Extracts one page and replaces its previous extraction. Throws DailyQuotaError when quota is out. */
export async function extractPage(editionId: number, page: number): Promise<ExtractPageResult> {
  const row = await prisma.editionPage.findUniqueOrThrow({
    where: { editionId_page: { editionId, page } },
    select: { revisedText: true },
  });
  if (!row.revisedText) throw new Error("Página ainda sem transcrição.");

  const { json, model } = await generateJson(PROMPT + reflowText(row.revisedText));
  const articles = parseExtraction(json);

  await clearPageExtraction(editionId, [page]);
  const touched: number[] = [];
  let people = 0;
  let places = 0;
  for (const [position, a] of articles.entries()) {
    // Sequential: the same name can appear twice in one item.
    const personIds: number[] = [];
    for (const p of a.people) personIds.push(await upsertEntity("person", p.surface));
    const placeIds: number[] = [];
    for (const l of a.places) placeIds.push(await upsertEntity("place", l));
    await prisma.article.create({
      data: {
        editionId,
        page,
        position,
        title: a.title,
        kind: a.kind,
        summary: a.summary,
        model,
        mentions: {
          create: [
            ...a.people.map((p, i) => ({
              entityId: personIds[i],
              surface: p.surface.slice(0, 255),
              honorific: p.honorific,
              role: p.role,
            })),
            ...a.places.map((l, i) => ({ entityId: placeIds[i], surface: l.slice(0, 255) })),
          ],
        },
      },
    });
    touched.push(...personIds, ...placeIds);
    people += personIds.length;
    places += placeIds.length;
  }
  await prisma.editionPage.update({
    where: { editionId_page: { editionId, page } },
    data: { entitiesAt: new Date(), entitiesError: null },
  });
  await refreshEntities(touched);
  return { articles: articles.length, people, places, model };
}

const pendingExtraction = {
  revisedText: { not: null },
  entitiesAt: null,
  entitiesError: null,
  edition: { deletedAt: null },
};

export async function countPendingExtraction() {
  return prisma.editionPage.count({ where: pendingExtraction });
}

export type ExtractNextResult =
  | { status: "extracted"; editionId: number; page: number; result: ExtractPageResult; remaining: number }
  | { status: "failed"; editionId: number; page: number; error: string; remaining: number }
  | { status: "quota"; remaining: number }
  | { status: "done"; remaining: 0 };

/** Extracts the next transcribed page that hasn't been extracted yet. */
export async function extractNextPage(): Promise<ExtractNextResult> {
  const next = await prisma.editionPage.findFirst({
    where: pendingExtraction,
    orderBy: [{ editionId: "asc" }, { page: "asc" }],
    select: { editionId: true, page: true },
  });
  if (!next) return { status: "done", remaining: 0 };
  try {
    const result = await extractPage(next.editionId, next.page);
    return { status: "extracted", ...next, result, remaining: await countPendingExtraction() };
  } catch (err) {
    if (err instanceof DailyQuotaError) return { status: "quota", remaining: await countPendingExtraction() };
    const error = (err as Error).message.slice(0, 1000);
    await prisma.editionPage.update({ where: { editionId_page: next }, data: { entitiesError: error } });
    return { status: "failed", ...next, error, remaining: await countPendingExtraction() };
  }
}
