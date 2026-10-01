import Link from "next/link";
import { getPendingTranscriptionSuggestions } from "@/lib/transcription-suggestions";
import PageHeader from "@/components/admin/PageHeader";
import ReadingSuggestionRow from "./ReadingSuggestionRow";

export const dynamic = "force-dynamic";

export default async function ReadingSuggestionsPage() {
  const suggestions = await getPendingTranscriptionSuggestions();

  return (
    <>
      <Link
        href="/admin/edicoes"
        className="mb-3 inline-block text-xs text-slate-400 transition-colors hover:text-brand-700"
      >
        ← Voltar para Edições
      </Link>

      <PageHeader
        title="Sugestões de leitura"
        description={
          <>
            Leituras de trechos <code>[ilegível]</code> enviadas por visitantes no painel de transcrição. Aprovar
            troca o marcador pelo texto sugerido e guarda a mudança no histórico da página — confira no jornal antes.
          </>
        }
      />

      {suggestions.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Nenhuma sugestão pendente.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <ReadingSuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </>
  );
}
