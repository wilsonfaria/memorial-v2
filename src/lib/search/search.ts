import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isMeiliConfigured, meiliFetch, MEILI_INDEX } from "@/lib/search/meili";
import { cropAndMark, MARK_END, MARK_START } from "@/lib/search/highlight";
import { EMBED_DIMS, EMBED_MODEL, embedQuery, MEILI_EMBEDDER } from "@/lib/search/embeddings";
import { bestPassage, cropPassage, pageSearchText, textHash, unpackVectors, type Passage } from "@/lib/search/passages";

/**
 * Full-text search over the newspapers' page text. Meilisearch first
 * (typo-tolerant — matters a lot for OCR'd scans), MariaDB FULLTEXT on
 * edition_pages when Meilisearch isn't configured or doesn't answer in time.
 * Either way: one hit per edition (its best page), ranked by relevance.
 *
 * When the query can be embedded (see embeddings.ts), Meilisearch runs a
 * hybrid search: keyword ranking blended with the meaning of the page
 * passages, so "enchente" also finds "as aguas do rio invadiram a cidade".
 */

export type TextSearchFilters = { decade?: number; year?: number; month?: number; day?: number };

/** `semantic`: found by meaning only — none of the typed words are on the page. */
export type TextSearchHit = { editionId: number; page: number; snippet: string; semantic?: boolean };

export type TextSearchResult = { hits: TextSearchHit[]; total: number; engine: "meilisearch" | "mariadb"; hybrid?: boolean };

const SEARCH_TIMEOUT_MS = 3000;

/** 0 = keywords only, 1 = meaning only. Words typed still weigh most: names and places are what people look up. */
const SEMANTIC_RATIO = Number(process.env.SEARCH_SEMANTIC_RATIO ?? 0.4);
/**
 * Semantic search always has a "nearest" page, however far; below this
 * blended score a hit is noise. Tuned on the real archive (see search.test.ts).
 */
const MIN_RANKING_SCORE = Number(process.env.SEARCH_MIN_SCORE ?? 0.3);

async function searchMeili(
  q: string,
  f: TextSearchFilters,
  page: number,
  pageSize: number,
  vector: number[] | null
): Promise<TextSearchResult> {
  const filter = [
    f.decade != null && `decade = ${f.decade}`,
    f.year != null && `year = ${f.year}`,
    f.month != null && `month = ${f.month}`,
    f.day != null && `day = ${f.day}`,
  ].filter(Boolean);

  const res = await meiliFetch<{
    hits: { editionId: number; page: number; _formatted?: { text?: string } }[];
    totalHits: number;
  }>(`/indexes/${MEILI_INDEX}/search`, {
    method: "POST",
    timeoutMs: SEARCH_TIMEOUT_MS,
    body: JSON.stringify({
      q,
      filter,
      page,
      hitsPerPage: pageSize,
      attributesToRetrieve: ["editionId", "page"],
      attributesToCrop: ["text"],
      cropLength: 36,
      cropMarker: "…",
      attributesToHighlight: ["text"],
      highlightPreTag: MARK_START,
      highlightPostTag: MARK_END,
      ...(vector
        ? {
            vector,
            hybrid: { embedder: MEILI_EMBEDDER, semanticRatio: SEMANTIC_RATIO },
            rankingScoreThreshold: MIN_RANKING_SCORE,
          }
        : {}),
    }),
  });

  const hits: TextSearchHit[] = res.hits.map((h) => ({
    editionId: h.editionId,
    page: h.page,
    snippet: h._formatted?.text ?? "",
  }));
  if (vector) await semanticSnippets(hits, vector);
  return { engine: "meilisearch", total: res.totalHits, hits, hybrid: Boolean(vector) };
}

/**
 * A hit found by meaning alone has nothing to highlight, and Meilisearch
 * would crop the start of the page. Show the passage closest to the query
 * instead, so the snippet explains why the page came up.
 */
async function semanticSnippets(hits: TextSearchHit[], vector: number[]) {
  const semantic = hits.filter((h) => !h.snippet.includes(MARK_START));
  if (semantic.length === 0) return;
  const where = { OR: semantic.map((h) => ({ editionId: h.editionId, page: h.page })) };
  const [pages, embeddings] = await Promise.all([
    prisma.editionPage.findMany({ where, select: { editionId: true, page: true, text: true, revisedText: true } }),
    prisma.pageEmbedding.findMany({
      where: { ...where, model: EMBED_MODEL, error: null },
      select: { editionId: true, page: true, textHash: true, chunks: true, vectors: true },
    }),
  ]);
  const key = (x: { editionId: number; page: number }) => `${x.editionId}-${x.page}`;
  const textByPage = new Map(pages.map((p) => [key(p), pageSearchText(p)]));
  const embByPage = new Map(embeddings.map((e) => [key(e), e]));
  for (const hit of semantic) {
    const text = textByPage.get(key(hit));
    const emb = embByPage.get(key(hit));
    if (text == null || !emb || emb.textHash !== textHash(text)) continue;
    const best = bestPassage(emb.chunks as Passage[], unpackVectors(emb.vectors, EMBED_DIMS), vector);
    if (!best) continue;
    hit.snippet = cropPassage(text, best);
    hit.semantic = true;
  }
}

async function searchMariaDb(q: string, f: TextSearchFilters, page: number, pageSize: number): Promise<TextSearchResult> {
  // Both columns: the FULLTEXT index covers (text, revisedText), and MATCH
  // must name exactly the indexed column list.
  const conditions = [
    Prisma.sql`e.deletedAt IS NULL`,
    Prisma.sql`MATCH(p.text, p.revisedText) AGAINST (${q} IN NATURAL LANGUAGE MODE)`,
  ];
  if (f.decade != null) conditions.push(Prisma.sql`d.startYear = ${f.decade}`);
  if (f.year != null) conditions.push(Prisma.sql`y.year = ${f.year}`);
  if (f.month != null) conditions.push(Prisma.sql`m.month = ${f.month}`);
  if (f.day != null) conditions.push(Prisma.sql`DAY(e.publishedAt) = ${f.day}`);
  const where = Prisma.join(conditions, " AND ");
  const from = Prisma.sql`
    FROM edition_pages p
    JOIN editions e ON e.id = p.editionId
    JOIN months m ON m.id = e.monthId
    JOIN years y ON y.id = m.yearId
    JOIN decades d ON d.id = y.decadeId`;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ editionId: number; page: number; text: string }[]>`
      SELECT editionId, page, text FROM (
        SELECT p.editionId, p.page, COALESCE(p.revisedText, p.text) AS text, e.publishedAt,
          MATCH(p.text, p.revisedText) AGAINST (${q} IN NATURAL LANGUAGE MODE) AS score,
          ROW_NUMBER() OVER (PARTITION BY p.editionId ORDER BY MATCH(p.text, p.revisedText) AGAINST (${q} IN NATURAL LANGUAGE MODE) DESC, p.page) AS rn
        ${from}
        WHERE ${where}
      ) ranked
      WHERE rn = 1
      ORDER BY score DESC, publishedAt DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(DISTINCT p.editionId) AS total ${from} WHERE ${where}`,
  ]);

  return {
    engine: "mariadb",
    total: Number(countRows[0]?.total ?? 0),
    hits: rows.map((r) => ({ editionId: r.editionId, page: r.page, snippet: cropAndMark(r.text, q) })),
  };
}

export async function searchEditionText(
  q: string,
  filters: TextSearchFilters,
  page: number,
  pageSize: number
): Promise<TextSearchResult> {
  if (isMeiliConfigured()) {
    const vector = await embedQuery(q);
    try {
      return await searchMeili(q, filters, page, pageSize, vector);
    } catch (err) {
      if (vector) {
        // e.g. the index settings (embedder) not applied yet on this server: keywords only.
        console.error("Busca híbrida falhou — só palavra-chave:", (err as Error).message);
        try {
          return await searchMeili(q, filters, page, pageSize, null);
        } catch (err2) {
          err = err2;
        }
      }
      console.error("Meilisearch indisponível — usando a busca do MariaDB:", (err as Error).message);
    }
  }
  return searchMariaDb(q, filters, page, pageSize);
}
