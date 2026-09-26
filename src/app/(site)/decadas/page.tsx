import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getNavigationTree } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DecadesPage() {
  const tree = await getNavigationTree();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Décadas" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Décadas</h1>
        <p className="mb-6 text-sm text-slate-500">Navegue pelo acervo por período histórico.</p>

        {tree.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhuma década cadastrada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tree.map((decade) => {
              const editionCount = decade.years.reduce(
                (sum, y) => sum + y.months.reduce((s, m) => s + m.editionCount, 0),
                0
              );
              return (
                <Link
                  key={decade.id}
                  href={`/edicoes?decada=${decade.startYear}`}
                  className="rounded-xl border border-paper-200 bg-white p-4 text-center hover:border-brand-300"
                >
                  <p className="text-lg font-semibold text-brand-900">{decade.label}</p>
                  <p className="text-xs text-slate-400">
                    {editionCount} {editionCount === 1 ? "edição" : "edições"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
