import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { getModelQuality } from "@/lib/ocr-revision/review";

export const dynamic = "force-dynamic";

// Two decimals below 1%, so a couple of wrong letters don't read as "0,0%".
const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.01 ? 2 : 1).replace(".", ",")}%`;

function tone(cer: number) {
  if (cer <= 0.02) return "text-green-700";
  if (cer <= 0.05) return "text-amber-700";
  return "text-red-600";
}

/** Gold-set scores: each model's first transcription vs. the human-verified text. */
export default async function AiQualityPage() {
  const { models, pages } = await getModelQuality();

  return (
    <div>
      <Link href="/admin/edicoes" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} /> Edições
      </Link>
      <PageHeader
        title="Qualidade da IA"
        description="Compara a primeira transcrição de cada modelo com o texto conferido por uma pessoa. CER = erros por caractere; WER = erros por palavra (quanto menor, melhor). Referência usual para jornal antigo: CER abaixo de 2% é excelente, até 5% é bom."
      />

      {models.length === 0 ? (
        <div className="rounded-xl border border-paper-200 bg-white p-6 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Ainda não há páginas conferidas.</p>
          <p className="mt-1">
            Abra uma edição transcrita (ícone de livro na lista de edições) e use <strong>Conferir</strong> quando o texto
            estiver certo ou <strong>Corrigir</strong> para ajustar com a página digitalizada ao lado. Com umas 20 páginas
            conferidas, de épocas diferentes, as notas abaixo passam a ser confiáveis.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 overflow-x-auto rounded-xl border border-paper-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Modelo</th>
                  <th className="px-4 py-2.5 text-right">Páginas</th>
                  <th className="px-4 py-2.5 text-right">CER</th>
                  <th className="px-4 py-2.5 text-right">WER</th>
                  <th className="px-4 py-2.5 text-right">Sem nenhum erro</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model} className="border-t border-paper-100">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{m.model}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.pages}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${tone(m.cer)}`}>{pct(m.cer)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{pct(m.wer)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{m.perfect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages.length < 20 && (
              <p className="border-t border-paper-100 px-4 py-2 text-xs text-amber-700">
                Amostra pequena ({pages.length} página{pages.length === 1 ? "" : "s"}): confira mais páginas, de décadas
                diferentes, antes de tirar conclusões.
              </p>
            )}
          </div>

          <h2 className="mb-2 text-sm font-semibold text-slate-700">Páginas conferidas</h2>
          <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Página</th>
                  <th className="px-4 py-2">Modelo</th>
                  <th className="px-4 py-2 text-right">CER</th>
                  <th className="px-4 py-2 text-right">WER</th>
                  <th className="px-4 py-2">Conferida por</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={`${p.editionId}-${p.page}`} className="border-t border-paper-100">
                    <td className="px-4 py-2">
                      <Link href={`/admin/edicoes/${p.editionId}`} className="text-brand-700 hover:underline">
                        {p.editionName} · pág. {p.page}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{p.model}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${tone(p.cer)}`}>{pct(p.cer)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">{pct(p.wer)}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {p.verifiedBy} · {p.verifiedAt.toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
