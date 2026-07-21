import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type TreeMonth = { id: number; month: number; editionCount: number };
export type TreeYear = { id: number; year: number; months: TreeMonth[] };
export type TreeDecade = { id: number; label: string; startYear: number; years: TreeYear[] };

export type MenuPage = { slug: string; title: string; menuLabel: string | null };

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

export async function getRecentEditions(take = 10) {
  return prisma.edition.findMany({
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export async function getAllEditions() {
  return prisma.edition.findMany({
    orderBy: { publishedAt: "desc" },
  });
}

export type EditionFilters = { decade?: number; year?: number; month?: number; q?: string };

function buildEditionWhere(filters: EditionFilters): Prisma.EditionWhereInput {
  const monthFilter: Prisma.MonthWhereInput = {};
  if (filters.month) monthFilter.month = filters.month;
  if (filters.year || filters.decade) {
    monthFilter.year = {
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.decade ? { decade: { startYear: filters.decade } } : {}),
    };
  }

  const where: Prisma.EditionWhereInput = {};
  if (Object.keys(monthFilter).length > 0) where.month = monthFilter;
  if (filters.q) {
    const asNumber = Number(filters.q.replace(/\D/g, ""));
    where.OR = [
      { title: { contains: filters.q } },
      ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ editionNumber: asNumber }] : []),
    ];
  }
  return where;
}

export async function getFilteredEditions(filters: EditionFilters) {
  return prisma.edition.findMany({
    where: buildEditionWhere(filters),
    orderBy: { publishedAt: "desc" },
  });
}

export async function getFilteredEditionsPaged(
  filters: EditionFilters,
  page: number,
  pageSize: number
) {
  const where = buildEditionWhere(filters);
  const [editions, total] = await Promise.all([
    prisma.edition.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.edition.count({ where }),
  ]);
  return { editions, total };
}

export async function getEditionsForMonth(monthId: number) {
  return prisma.edition.findMany({
    where: { monthId },
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
  return prisma.edition.findUnique({ where: { id } });
}

export async function getSponsorsForPlacement(placement: "SIDEBAR" | "FOOTER") {
  return prisma.sponsor.findMany({
    where: { active: true, OR: [{ placement }, { placement: "BOTH" }] },
    orderBy: { order: "asc" },
  });
}

export async function getAllActiveSponsors() {
  return prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: "asc" } });
}

export async function getPublishedMenuPages() {
  return prisma.page.findMany({
    where: { published: true, showInMenu: true },
    orderBy: { menuOrder: "asc" },
    select: { slug: true, title: true, menuLabel: true },
  });
}

export async function getPublishedPageBySlug(slug: string) {
  return prisma.page.findFirst({
    where: { slug, published: true },
    include: { images: { orderBy: { order: "asc" } } },
  });
}

const FOOTER_LEGAL_SLUGS = ["termos-de-uso", "politica-de-privacidade"] as const;

export async function getFooterLegalPages() {
  const pages = await prisma.page.findMany({
    where: { slug: { in: [...FOOTER_LEGAL_SLUGS] }, published: true },
    select: { slug: true, title: true, menuLabel: true },
  });
  return pages.map((p) => ({ slug: p.slug, label: p.menuLabel ?? p.title }));
}
