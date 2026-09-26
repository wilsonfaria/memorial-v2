import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getNavigationTree } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function YearsPage() {
  const tree = await getNavigationTree();
  const years = tree.flatMap((decade) =>
    decade.years.map((year) => ({
      id: year.id,
      year: year.year,
      startYear: decade.startYear,
      editionCount: year.months.reduce((s, m) => s + m.editionCount, 0),
    }))
  );

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Anos" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Anos</h1>
        <p className="mb-6 text-sm text-slate-500">Escolha o ano desejado.</p>

        {years.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum ano cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {years.map((y) => (
              <Link
                key={y.id}
                href={`/edicoes?decada=${y.startYear}&ano=${y.year}`}
                className="rounded-xl border border-paper-200 bg-white p-3 text-center hover:border-brand-300"
              >
                <p className="text-base font-semibold text-brand-900">{y.year}</p>
                <p className="text-[11px] text-slate-400">
                  {y.editionCount} {y.editionCount === 1 ? "edição" : "edições"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
