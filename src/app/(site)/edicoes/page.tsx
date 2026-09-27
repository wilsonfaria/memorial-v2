import Breadcrumb from "@/components/Breadcrumb";
import PublicEditionsFilterBar from "@/components/PublicEditionsFilterBar";
import EditionResultRow from "@/components/EditionResultRow";
import { getFilteredEditionsPaged, getNavigationTree } from "@/lib/data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AllEditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ decada?: string; ano?: string; mes?: string; dia?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [tree, { editions, total }] = await Promise.all([
    getNavigationTree(),
    getFilteredEditionsPaged(
      {
        decade: params.decada ? Number(params.decada) : undefined,
        year: params.ano ? Number(params.ano) : undefined,
        month: params.mes ? Number(params.mes) : undefined,
        day: params.dia ? Number(params.dia) : undefined,
        q: params.q,
      },
      page,
      PAGE_SIZE
    ),
  ]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeParams = new URLSearchParams();
  if (params.decada) activeParams.set("decada", params.decada);
  if (params.ano) activeParams.set("ano", params.ano);
  if (params.mes) activeParams.set("mes", params.mes);
  if (params.dia) activeParams.set("dia", params.dia);
  if (params.q) activeParams.set("q", params.q);

  function pageHref(p: number) {
    const sp = new URLSearchParams(activeParams);
    sp.set("page", String(p));
    return `/edicoes?${sp.toString()}`;
  }

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Todas as edições" }]} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        <aside className="w-full md:w-60 md:shrink-0">
          <PublicEditionsFilterBar tree={tree} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-brand-900">
                {params.q ? `Busca: “${params.q}”` : "Todas as edições"}
              </h1>
              {params.q && (
                <p className="text-xs text-slate-400">No texto das páginas dos jornais · ordenado por relevância</p>
              )}
            </div>
            <p className="shrink-0 text-xs text-slate-400">
              {total === 0 ? "Nenhum resultado" : `${from} - ${to} de ${total}`}
            </p>
          </div>

          {editions.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {params.q
                ? "Nada encontrado no texto dos jornais. Tente outra palavra ou remova os filtros."
                : "Nenhuma edição encontrada com esses filtros."}
            </p>
          ) : (
            editions.map((edition) => <EditionResultRow key={edition.id} edition={edition} />)
          )}

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
      </div>
    </>
  );
}
