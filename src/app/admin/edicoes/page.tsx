import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildTitleOrNumberFilter } from "@/lib/data";
import EditionForm from "@/components/admin/EditionForm";
import EditionsFilterBar from "./EditionsFilterBar";
import EditionsList from "./EditionsList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminEditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ newspaperId?: string; year?: string; month?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const newspaperId = params.newspaperId ? Number(params.newspaperId) : undefined;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

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
    where.OR = await buildTitleOrNumberFilter(q);
  }

  const [newspapers, distinctYears, total, editions] = await Promise.all([
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
    prisma.edition.count({ where }),
    prisma.edition.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { month: { include: { year: { include: { decade: true } } } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const activeParams = new URLSearchParams();
  if (params.newspaperId) activeParams.set("newspaperId", params.newspaperId);
  if (params.year) activeParams.set("year", params.year);
  if (params.month) activeParams.set("month", params.month);
  if (params.q) activeParams.set("q", params.q);

  function pageHref(p: number) {
    const sp = new URLSearchParams(activeParams);
    sp.set("page", String(p));
    return `/admin/edicoes?${sp.toString()}`;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Edições</h1>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Nova edição</h2>
        <EditionForm newspapers={newspapers} />
      </div>

      <EditionsFilterBar newspapers={newspapers} years={distinctYears.map((y) => y.year)} />

      <p className="mb-1 text-xs text-slate-400">
        {total === 0 ? "Nenhuma edição encontrada." : `Mostrando ${from} - ${to} de ${total} edição(ões).`}
      </p>
      <EditionsList editions={editions} />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={pageHref(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                p === page ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-brand-50"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
