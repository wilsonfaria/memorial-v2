import { prisma } from "@/lib/prisma";

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
