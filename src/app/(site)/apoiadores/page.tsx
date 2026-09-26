import Breadcrumb from "@/components/Breadcrumb";
import { getAllActiveSponsors } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const sponsors = await getAllActiveSponsors();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Apoiadores" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-900">Apoiadores</h1>
        <p className="text-sm text-slate-500">
          Empresas e pessoas que ajudam a manter este acervo vivo e acessível a todos.
        </p>
      </div>

      {sponsors.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-400">Nenhum apoiador cadastrado ainda.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {sponsors.map((sponsor) => {
          const content = (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-paper-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-300 hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                className="max-h-24 max-w-full object-contain"
              />
              <span className="line-clamp-1 text-center text-xs text-slate-400">{sponsor.name}</span>
            </div>
          );

          return sponsor.linkUrl ? (
            <a key={sponsor.id} href={sponsor.linkUrl} target="_blank" rel="noopener noreferrer sponsored">
              {content}
            </a>
          ) : (
            <div key={sponsor.id}>{content}</div>
          );
        })}
      </div>
      </div>
    </>
  );
}
