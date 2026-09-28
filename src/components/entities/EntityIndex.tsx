import Link from "next/link";
import { Search } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { listEntities, type EntityKind } from "@/lib/entities/queries";

const COPY: Record<EntityKind, { title: string; intro: string; base: string; placeholder: string; empty: string }> = {
  person: {
    title: "Pessoas no jornal",
    intro:
      "Cada nome citado nas páginas já transcritas, com todas as vezes em que aparece ao longo dos anos. Os nomes são reunidos mesmo quando a grafia mudou (Motta/Mota, Baptista/Batista). Lista gerada automaticamente por IA a partir da transcrição — pode conter erros.",
    base: "/pessoas",
    placeholder: "Buscar um nome (ex.: Alzamora)",
    empty: "Nenhuma pessoa encontrada.",
  },
  place: {
    title: "Lugares no jornal",
    intro:
      "Cidades, distritos, fazendas, ruas e estabelecimentos citados nas páginas já transcritas. Grafias antigas e novas ficam juntas (Piumhy/Piumhi, Bambuhy/Bambuí). Lista gerada automaticamente por IA — pode conter erros.",
    base: "/lugares",
    placeholder: "Buscar um lugar (ex.: Piumhi)",
    empty: "Nenhum lugar encontrado.",
  },
};

const year = (d: Date | null) => (d ? d.getUTCFullYear() : null);

/** Public index of people or places found by the structured extraction. */
export default async function EntityIndex({ kind, q, page }: { kind: EntityKind; q?: string; page: number }) {
  const copy = COPY[kind];
  const { total, items, pages } = await listEntities(kind, q, page);
  const href = (p: number) => `${copy.base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: copy.title }]} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">{copy.title}</h1>
        <p className="mb-6 max-w-prose text-sm leading-relaxed text-slate-500">{copy.intro}</p>

        <form action={copy.base} className="mb-6 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder={copy.placeholder}
              className="w-full rounded-lg border border-paper-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Buscar</button>
        </form>

        <p className="mb-3 text-xs text-slate-400">
          {total} {kind === "person" ? "pessoa(s)" : "lugar(es)"}
          {q ? ` para “${q}”` : ""} · ordenados pelo número de menções
        </p>

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{copy.empty}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((e) => {
              const from = year(e.firstDate);
              const to = year(e.lastDate);
              return (
                <li key={e.id}>
                  <Link
                    href={`${copy.base}/${e.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-paper-200 bg-white px-3 py-2.5 hover:border-brand-300"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-brand-900">{e.name}</span>
                      {from && (
                        <span className="text-xs text-slate-400">{from === to ? from : `${from}–${to}`}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700">
                      {e.mentionCount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link href={href(page - 1)} className="text-brand-700 hover:underline">
                ← Anteriores
              </Link>
            )}
            <span className="text-slate-400">
              Página {page} de {pages}
            </span>
            {page < pages && (
              <Link href={href(page + 1)} className="text-brand-700 hover:underline">
                Próximas →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
