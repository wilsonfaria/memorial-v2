import Link from "next/link";

type Milestone = { id: number; year: number; title: string };

export default function TimelineSection({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-brand-900">Linha do Tempo</h2>
        <Link href="/linha-do-tempo" className="text-xs font-medium text-accent-600 hover:text-accent-700">
          Ver linha do tempo completa
        </Link>
      </div>
      <p className="mb-6 -mt-4 text-sm text-slate-500">Uma jornada de {new Date().getFullYear() - milestones[0].year} anos</p>

      <div className="overflow-x-auto pb-2">
        <div className="relative flex min-w-max items-start gap-10 px-2 pt-2">
          <div className="absolute left-0 right-0 top-[7px] h-px bg-brand-200" />
          {milestones.map((m) => (
            <div key={m.id} className="relative flex w-24 flex-col items-center text-center">
              <div className="z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow" />
              <p className="mt-2 text-sm font-semibold text-brand-900">{m.year}</p>
              <p className="text-xs text-slate-500">{m.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
