import { prisma } from "@/lib/prisma";
import SponsorForm from "./SponsorForm";
import SponsorRow from "./SponsorRow";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  const sponsors = await prisma.sponsor.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-brand-900">Patrocinadores</h1>
      <p className="mb-6 text-sm text-slate-500">
        Os patrocinadores marcados como &quot;lateral&quot; aparecem fixos na barra lateral direita
        do site (cards de ~200px de altura). Os marcados como &quot;rodapé&quot; aparecem em um
        carrossel no rodapé de todas as páginas. A ordem define a sequência de exibição.
      </p>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Novo patrocinador</h2>
        <SponsorForm />
      </div>

      <div className="flex flex-col gap-1">
        {sponsors.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum patrocinador cadastrado ainda.</p>
        )}
        {sponsors.map((s) => (
          <SponsorRow key={s.id} sponsor={s} />
        ))}
      </div>
    </div>
  );
}
