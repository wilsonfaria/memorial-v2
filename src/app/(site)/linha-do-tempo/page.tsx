import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedTimeline } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const milestones = await getPublishedTimeline();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Linha do Tempo" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 *:max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Linha do Tempo</h1>
        <p className="mb-8 text-sm text-slate-500">Uma jornada através da história do jornal e da região.</p>

        {milestones.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum marco cadastrado ainda.</p>
        ) : (
          <ol className="relative border-l border-brand-200 pl-6">
            {milestones.map((m) => (
              <li key={m.id} className="mb-8 last:mb-0">
                <div className="absolute -ml-[31px] mt-1 h-3 w-3 rounded-full bg-brand-600" />
                <p className="text-sm font-semibold text-brand-700">{m.year}</p>
                <p className="text-base font-semibold text-brand-900">{m.title}</p>
                {m.description && <p className="mt-1 text-sm text-slate-500">{m.description}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
