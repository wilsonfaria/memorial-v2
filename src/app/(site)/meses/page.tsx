import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getNavigationTree } from "@/lib/data";
import { monthName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MonthsPage() {
  const tree = await getNavigationTree();
  const months = tree.flatMap((decade) =>
    decade.years.flatMap((year) =>
      year.months.map((month) => ({
        id: month.id,
        month: month.month,
        year: year.year,
        editionCount: month.editionCount,
      }))
    )
  );

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Meses" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Meses</h1>
        <p className="mb-6 text-sm text-slate-500">Veja as edições publicadas em cada mês.</p>

        {months.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum mês cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {months.map((m) => (
              <Link
                key={m.id}
                href={`/mes/${m.id}`}
                className="rounded-xl border border-paper-200 bg-white p-3 text-center hover:border-brand-300"
              >
                <p className="text-sm font-semibold text-brand-900">
                  {monthName(m.month)} de {m.year}
                </p>
                <p className="text-[11px] text-slate-400">
                  {m.editionCount} {m.editionCount === 1 ? "edição" : "edições"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
