import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildTitleOrNumberFilter } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import EditionForm from "@/components/admin/EditionForm";
import EditionsFilterBar from "./EditionsFilterBar";
import EditionsList from "./EditionsList";
import SearchIndexPanel from "./SearchIndexPanel";
import PipelinePanel from "./PipelinePanel";
import AiWorkerPanel from "./AiWorkerPanel";
import AiProviderPanel from "./AiProviderPanel";
import { getSearchIndexStatusAction } from "@/lib/actions/edition-actions";
import { getPipelineStatuses, getPipelineTotals } from "@/lib/pipeline";
import { getProviderStatuses } from "@/lib/ai-providers/registry";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Quick filters by pipeline stage, to pick editions by hand (?etapa=…). */
const STAGE_FILTERS: { key: string; label: string; where: Prisma.EditionWhereInput }[] = [
  { key: "sem-texto", label: "Sem texto", where: { pages: { none: {} } } },
  { key: "ia-pendente", label: "IA pendente", where: { pages: { some: { revisedAt: null, revisionError: null } } } },
  { key: "ia-erro", label: "IA com erro", where: { pages: { some: { revisedAt: null, revisionError: { not: null } } } } },
  { key: "ia-completa", label: "IA completa", where: { pages: { some: {}, every: { revisedAt: { not: null } } } } },
];

export default async function AdminEditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ newspaperId?: string; year?: string; month?: string; q?: string; page?: string; etapa?: string }>;
}) {
  const params = await searchParams;
  const stage = STAGE_FILTERS.find((f) => f.key === params.etapa);
  const newspaperId = params.newspaperId ? Number(params.newspaperId) : undefined;
  const year = params.year ? Number(params.year) : undefined;
  const month = params.month ? Number(params.month) : undefined;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.EditionWhereInput = { deletedAt: null };
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
  if (stage) Object.assign(where, stage.where);

  const [newspapers, distinctYears, total, editions, searchStatus, pipelineTotals] = await Promise.all([
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
      select: {
        id: true,
        title: true,
        publishedAt: true,
        fileSizeBytes: true,
        editionNumber: true,
        // Only whether the edition has searchable page text (edition_pages).
        _count: { select: { pages: true } },
        month: { select: { year: { select: { year: true, decade: { select: { label: true } } } } } },
      },
    }),
    getSearchIndexStatusAction(),
    getPipelineTotals(),
  ]);
  const pipeline = await getPipelineStatuses(editions.map((e) => e.id));

  function stageHref(key: string | null) {
    const sp = new URLSearchParams();
    for (const k of ["newspaperId", "year", "month", "q"] as const) if (params[k]) sp.set(k, params[k]!);
    if (key) sp.set("etapa", key);
    return `/admin/edicoes${sp.toString() ? `?${sp}` : ""}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const activeParams = new URLSearchParams();
  if (params.newspaperId) activeParams.set("newspaperId", params.newspaperId);
  if (params.year) activeParams.set("year", params.year);
  if (params.month) activeParams.set("month", params.month);
  if (params.q) activeParams.set("q", params.q);
  if (stage) activeParams.set("etapa", stage.key);

  function pageHref(p: number) {
    const sp = new URLSearchParams(activeParams);
    sp.set("page", String(p));
    return `/admin/edicoes?${sp.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Edições"
        description="Cadastro manual de edições do acervo. Para enviar várias de uma vez, use o Upload em massa."
      />

      <AiProviderPanel providers={getProviderStatuses()} />
      <AiWorkerPanel />
      <PipelinePanel totals={pipelineTotals} />

      <SearchIndexPanel initialStatus={searchStatus} />

      <CreatePanel label="Nova edição" title="Nova edição">
        <EditionForm newspapers={newspapers} />
      </CreatePanel>

      <EditionsFilterBar newspapers={newspapers} years={distinctYears.map((y) => y.year)} />

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400">Etapa:</span>
        {[{ key: null, label: "Todas" }, ...STAGE_FILTERS].map((f) => {
          const active = (stage?.key ?? null) === f.key;
          return (
            <a
              key={f.key ?? "all"}
              href={stageHref(f.key)}
              className={`rounded-full px-2.5 py-1 ring-1 ${
                active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-paper-200 hover:ring-brand-300"
              }`}
            >
              {f.label}
            </a>
          );
        })}
      </div>

      <p className="mb-1 text-xs text-slate-400">
        {total === 0 ? "Nenhuma edição encontrada." : `Mostrando ${from} - ${to} de ${total} edição(ões).`}
      </p>
      <EditionsList
        editions={editions.map(({ _count, ...e }) => ({ ...e, hasExtractedText: _count.pages > 0 }))}
        pipeline={pipeline}
      />

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
    </>
  );
}
