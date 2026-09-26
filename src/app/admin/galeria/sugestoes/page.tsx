import Link from "next/link";
import { getPendingCaptionSuggestions } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import SuggestionRow from "./SuggestionRow";

export const dynamic = "force-dynamic";

export default async function CaptionSuggestionsPage() {
  const suggestions = await getPendingCaptionSuggestions();

  return (
    <>
      <Link
        href="/admin/galeria"
        className="mb-3 inline-block text-xs text-slate-400 transition-colors hover:text-brand-700"
      >
        ← Voltar para Galeria
      </Link>

      <PageHeader
        title="Sugestões de identificação"
        description={
          <>
            Identificações de fotos enviadas por visitantes em <code>/galeria</code>. Aprovar
            substitui a legenda atual da foto pelo texto sugerido.
          </>
        }
      />

      {suggestions.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Nenhuma sugestão pendente.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </>
  );
}
