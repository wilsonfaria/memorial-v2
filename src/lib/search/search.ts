import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isMeiliConfigured, meiliFetch, MEILI_INDEX } from "@/lib/search/meili";
import { cropAndMark, MARK_END, MARK_START } from "@/lib/search/highlight";

/**
 * Full-text search over the newspapers' page text. Meilisearch first
 * (typo-tolerant — matters a lot for OCR'd scans), MariaDB FULLTEXT on
 * edition_pages when Meilisearch isn't configured or doesn't answer in time.
 * Either way: one hit per edition (its best page), ranked by relevance.
 */

export type TextSearchFilters = { decade?: number; year?: number; month?: number; day?: number };

export type TextSearchHit = { editionId: number; page: number; snippet: string };

export type TextSearchResult = { hits: TextSearchHit[]; total: number; engine: "meilisearch" | "mariadb" };

const SEARCH_TIMEOUT_MS = 3000;

async function searchMeili(q: string, f: TextSearchFilters, page: number, pageSize: number): Promise<TextSearchResult> {
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
    }),
  });

  return {
    engine: "meilisearch",
    total: res.totalHits,
    hits: res.hits.map((h) => ({ editionId: h.editionId, page: h.page, snippet: h._formatted?.text ?? "" })),
  };
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
    try {
      return await searchMeili(q, filters, page, pageSize);
    } catch (err) {
      console.error("Meilisearch indisponível — usando a busca do MariaDB:", (err as Error).message);
    }
  }
  return searchMariaDb(q, filters, page, pageSize);
}
