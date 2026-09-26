import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type TreeMonth = { id: number; month: number; editionCount: number };
export type TreeYear = { id: number; year: number; months: TreeMonth[] };
export type TreeDecade = { id: number; label: string; startYear: number; years: TreeYear[] };

export async function getNewspaper() {
  return prisma.newspaper.findFirst({ orderBy: { id: "asc" } });
}

export async function getNavigationTree(): Promise<TreeDecade[]> {
  const decades = await prisma.decade.findMany({
    orderBy: { startYear: "desc" },
    include: {
      years: {
        orderBy: { year: "desc" },
        include: {
          months: {
            orderBy: { month: "desc" },
            include: { _count: { select: { editions: true } } },
          },
        },
      },
    },
  });

  return decades.map((d) => ({
    id: d.id,
    label: d.label,
    startYear: d.startYear,
    years: d.years.map((y) => ({
      id: y.id,
      year: y.year,
      months: y.months.map((m) => ({
        id: m.id,
        month: m.month,
        editionCount: m._count.editions,
      })),
    })),
  }));
}

/** Day-of-year (1–366) for a month/day pair, ignoring the actual year — used to compare dates across different years. */
function dayOfYear(month: number, day: number): number {
  return Math.floor((Date.UTC(2001, month - 1, day) - Date.UTC(2001, 0, 1)) / 86_400_000) + 1;
}

function circularDayDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 366 - raw);
}

export type OnThisDayEdition = {
  id: number;
  title: string;
  editionNumber: number | null;
  publishedAt: Date;
  thumbnailPath: string | null;
  fileSizeBytes: number | null;
  yearsAgo: number;
};

/**
 * "Há X anos": one edition per past year whose publish date falls closest to
 * today's month/day, capped to a tight window so a January edition never
 * shows up as a match for a July lookup. Used on the homepage in place of a
 * plain "recent editions" list — content that's always fresh without anyone
 * having to curate it.
 */
export async function getOnThisDayEditions(limit = 8): Promise<OnThisDayEdition[]> {
  const MAX_DAY_DISTANCE = 10;
  const now = new Date();
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const todayDoy = dayOfYear(now.getMonth() + 1, now.getDate());

  const editions = await prisma.edition.findMany({
    where: { publishedAt: { lt: thisYearStart }, deletedAt: null },
    select: {
      id: true,
      title: true,
      editionNumber: true,
      publishedAt: true,
      thumbnailPath: true,
      fileSizeBytes: true,
    },
  });

  const bestPerYear = new Map<number, { edition: (typeof editions)[number]; dist: number }>();
  for (const edition of editions) {
    const year = edition.publishedAt.getFullYear();
    const dist = circularDayDistance(todayDoy, dayOfYear(edition.publishedAt.getMonth() + 1, edition.publishedAt.getDate()));
    if (dist > MAX_DAY_DISTANCE) continue;
    const existing = bestPerYear.get(year);
    if (!existing || dist < existing.dist) bestPerYear.set(year, { edition, dist });
  }

  return [...bestPerYear.values()]
    .sort((a, b) => b.edition.publishedAt.getFullYear() - a.edition.publishedAt.getFullYear())
    .slice(0, limit)
    .map(({ edition }) => ({ ...edition, yearsAgo: now.getFullYear() - edition.publishedAt.getFullYear() }));
}

/**
 * "Qual jornal saiu no dia em que você nasceu?": finds the single edition
 * whose publish date is closest (by raw day count, across the whole
 * archive) to an arbitrary date the visitor types in.
 */
export async function getClosestEditionToDate(target: Date) {
  const editions = await prisma.edition.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      editionNumber: true,
      publishedAt: true,
      thumbnailPath: true,
      fileSizeBytes: true,
    },
  });
  if (editions.length === 0) return null;

  let best = editions[0];
  let bestDist = Math.abs(best.publishedAt.getTime() - target.getTime());
  for (const edition of editions.slice(1)) {
    const dist = Math.abs(edition.publishedAt.getTime() - target.getTime());
    if (dist < bestDist) {
      best = edition;
      bestDist = dist;
    }
  }
  return { edition: best, daysDiff: Math.round(bestDist / 86_400_000) };
}

export async function getAllEditions() {
  return prisma.edition.findMany({
    where: { deletedAt: null },
    orderBy: { publishedAt: "desc" },
  });
}

export type EditionFilters = {
  decade?: number;
  year?: number;
  month?: number;
  /** Day-of-month (1-31). No dedicated hierarchy level exists for this — filtered in-memory over the (already narrow) month-scoped result set rather than in SQL. */
  day?: number;
  q?: string;
};

/**
 * Prisma's MySQL/MariaDB driver binds string parameters with an explicit
 * `utf8mb4_bin` collation — even in raw `$queryRaw` calls, not just the
 * `contains` filter. The `editions.title` column is `utf8mb4_unicode_ci`,
 * so comparing it directly against that bound parameter throws
 * `DriverAdapterError: Illegal mix of collations`. Explicitly collating the
 * column to match makes both sides of the LIKE the same explicit collation,
 * which MariaDB allows.
 */
async function findEditionIdsByTitleOrText(q: string): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM editions
    WHERE deletedAt IS NULL
      AND (title COLLATE utf8mb4_bin LIKE CONCAT('%', ${q}, '%')
       OR extractedText COLLATE utf8mb4_bin LIKE CONCAT('%', ${q}, '%'))
  `;
  return rows.map((r) => r.id);
}

export async function buildTitleOrNumberFilter(q: string): Promise<Prisma.EditionWhereInput["OR"]> {
  const asNumber = Number(q.replace(/\D/g, ""));
  const ids = await findEditionIdsByTitleOrText(q);
  return [
    ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
    ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ editionNumber: asNumber }] : []),
  ];
}

async function buildEditionWhere(filters: EditionFilters): Promise<Prisma.EditionWhereInput> {
  const monthFilter: Prisma.MonthWhereInput = {};
  if (filters.month) monthFilter.month = filters.month;
  if (filters.year || filters.decade) {
    monthFilter.year = {
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.decade ? { decade: { startYear: filters.decade } } : {}),
    };
  }

  const where: Prisma.EditionWhereInput = { deletedAt: null };
  if (Object.keys(monthFilter).length > 0) where.month = monthFilter;
  if (filters.q) {
    where.OR = await buildTitleOrNumberFilter(filters.q);
  }
  return where;
}

export async function getFilteredEditions(filters: EditionFilters) {
  const where = await buildEditionWhere(filters);
  const editions = await prisma.edition.findMany({ where, orderBy: { publishedAt: "desc" } });
  return filters.day ? editions.filter((e) => e.publishedAt.getDate() === filters.day) : editions;
}

/**
 * Snippet of the matched edition's OCR text around the search term, so a
 * result found via full-text search shows *why* it matched (title-only
 * matches get no snippet — there's nothing to show beyond the title itself).
 */
async function getMatchSnippets(editionIds: number[], q: string): Promise<Record<number, string>> {
  if (editionIds.length === 0) return {};
  const rows = await prisma.$queryRaw<{ id: number; snippet: string | null }[]>`
    SELECT id,
      SUBSTRING(
        extractedText,
        GREATEST(LOCATE(${q} COLLATE utf8mb4_bin, extractedText COLLATE utf8mb4_bin) - 80, 1),
        220
      ) AS snippet
    FROM editions
    WHERE id IN (${Prisma.join(editionIds)})
      AND deletedAt IS NULL
      AND extractedText COLLATE utf8mb4_bin LIKE CONCAT('%', ${q}, '%')
  `;
  const map: Record<number, string> = {};
  for (const row of rows) {
    if (row.snippet) map[row.id] = row.snippet.trim();
  }
  return map;
}

export async function getFilteredEditionsPaged(
  filters: EditionFilters,
  page: number,
  pageSize: number
) {
  const where = await buildEditionWhere(filters);

  // Day-of-month has no SQL-level hierarchy to filter on, so when it's set we
  // fetch the (already narrow, month/year/decade-scoped) match set and
  // paginate in memory instead of pushing skip/take down to Prisma.
  if (filters.day) {
    const all = await prisma.edition.findMany({ where, orderBy: { publishedAt: "desc" } });
    const editions = all.filter((e) => e.publishedAt.getDate() === filters.day);
    const total = editions.length;
    const page1 = editions.slice((page - 1) * pageSize, page * pageSize);
    const snippets = filters.q ? await getMatchSnippets(page1.map((e) => e.id), filters.q) : {};
    return { editions: page1.map((e) => ({ ...e, matchSnippet: snippets[e.id] })), total };
  }

  const [editions, total] = await Promise.all([
    prisma.edition.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.edition.count({ where }),
  ]);
  const snippets = filters.q ? await getMatchSnippets(editions.map((e) => e.id), filters.q) : {};
  return { editions: editions.map((e) => ({ ...e, matchSnippet: snippets[e.id] })), total };
}

export async function getEditionsForMonth(monthId: number) {
  return prisma.edition.findMany({
    where: { monthId, deletedAt: null },
    orderBy: { publishedAt: "asc" },
  });
}

export async function getMonthBreadcrumb(monthId: number) {
  return prisma.month.findUnique({
    where: { id: monthId },
    include: { year: { include: { decade: true } } },
  });
}

export async function getEditionById(id: number) {
  return prisma.edition.findFirst({ where: { id, deletedAt: null } });
}

export async function getAllActiveSponsors() {
  return prisma.sponsor.findMany({ where: { active: true, deletedAt: null }, orderBy: { order: "asc" } });
}

export async function getPublishedPageBySlug(slug: string) {
  return prisma.page.findFirst({
    where: { slug, published: true, deletedAt: null },
    include: { images: { orderBy: { order: "asc" } } },
  });
}

export async function getPublishedChronicles() {
  return prisma.chronicle.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
  });
}

export async function getPublishedChronicleBySlug(slug: string) {
  return prisma.chronicle.findFirst({ where: { slug, published: true, deletedAt: null } });
}

/** Lightweight list for the homepage search panel's "Crônicas" dropdown. */
export async function getPublishedChronicleTitles() {
  return prisma.chronicle.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
    select: { slug: true, title: true },
  });
}

export async function getPublishedCharacters() {
  return prisma.character.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function getPublishedCharacterBySlug(slug: string) {
  return prisma.character.findFirst({ where: { slug, published: true, deletedAt: null } });
}

export async function getPublishedAlbums() {
  return prisma.galleryAlbum.findMany({
    where: { published: true, deletedAt: null },
    orderBy: { order: "asc" },
    include: { photos: { orderBy: { order: "asc" } } },
  });
}

export async function getPublishedAlbumBySlug(slug: string) {
  return prisma.galleryAlbum.findFirst({
    where: { slug, published: true, deletedAt: null },
    include: { photos: { orderBy: { order: "asc" } } },
  });
}

export async function getPendingCaptionSuggestions() {
  return prisma.photoCaptionSuggestion.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { photo: { include: { album: { select: { title: true, slug: true } } } } },
  });
}

export async function getPublishedTimeline() {
  return prisma.timelineMilestone.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ year: "asc" }, { order: "asc" }],
  });
}

export async function getPublishedProjects() {
  return prisma.project.findMany({ where: { published: true, deletedAt: null }, orderBy: { order: "asc" } });
}

export async function getPublishedProjectBySlug(slug: string) {
  return prisma.project.findFirst({ where: { slug, published: true, deletedAt: null } });
}
