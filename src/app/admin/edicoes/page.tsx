import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import EditionForm from "@/components/admin/EditionForm";
import EditionsFilterBar from "./EditionsFilterBar";
import EditionsList from "./EditionsList";

export const dynamic = "force-dynamic";

export default async function AdminEditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ newspaperId?: string; year?: string; month?: string; q?: string }>;
}) {
  const params = await searchParams;
  const newspaperId = params.newspaperId ? Number(params.newspaperId) : undefined;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const q = params.q?.trim();

  const where: Prisma.EditionWhereInput = {};
  const monthFilter: Prisma.MonthWhereInput = {};
  if (month) monthFilter.month = month;
  if (year || newspaperId) {
    monthFilter.year = {
      ...(year ? { year } : {}),
      ...(newspaperId ? { decade: { newspaperId } } : {}),
    };
  }
  if (Object.keys(monthFilter).length > 0) where.month = monthFilter;
  if (q) {
    const asNumber = Number(q.replace(/\D/g, ""));
    where.OR = [
      { title: { contains: q } },
      ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ editionNumber: asNumber }] : []),
    ];
  }

  const [newspapers, distinctYears, editions] = await Promise.all([
    prisma.newspaper.findMany({
      orderBy: { id: "asc" },
      include: {
        decades: {
          orderBy: { startYear: "desc" },
          include: {
            years: {
              orderBy: { year: "desc" },
              include: { months: { orderBy: { month: "asc" } } },
            },
          },
        },
      },
    }),
    prisma.year.findMany({ select: { year: true }, distinct: ["year"], orderBy: { year: "desc" } }),
    prisma.edition.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 200,
      include: { month: { include: { year: { include: { decade: true } } } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Edições</h1>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Nova edição</h2>
        <EditionForm newspapers={newspapers} />
      </div>

      <EditionsFilterBar newspapers={newspapers} years={distinctYears.map((y) => y.year)} />

      <p className="mb-1 text-xs text-slate-400">
        Mostrando {editions.length} edição(ões).
      </p>
      <EditionsList editions={editions} />
    </div>
  );
}
