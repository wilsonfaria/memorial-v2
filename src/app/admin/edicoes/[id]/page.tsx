import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import { Articles } from "@/components/TranscriptionPanel";

export const dynamic = "force-dynamic";

/** Admin review of one edition's text: AI transcription next to the original OCR, page by page. */
export default async function EditionTranscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const edition = await prisma.edition.findUnique({
    where: { id: Number(id) || 0 },
    select: {
      id: true,
      title: true,
      editionNumber: true,
      publishedAt: true,
      pages: {
        orderBy: { page: "asc" },
        select: { page: true, text: true, revisedText: true, revisedModel: true, revisedAt: true, revisionError: true },
      },
    },
  });
  if (!edition) notFound();

  const name = edition.editionNumber != null ? `Edição nº ${edition.editionNumber}` : edition.title;
  const revised = edition.pages.filter((p) => p.revisedAt).length;

  return (
    <div>
      <Link href="/admin/edicoes" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} /> Edições
      </Link>
      <PageHeader
        title={`Transcrição · ${name}`}
        description={`${formatDate(edition.publishedAt)} · ${revised} de ${edition.pages.length} página(s) transcritas pela IA. O texto original do OCR fica guardado e pode ser comparado abaixo de cada página.`}
        action={
          <a
            href={`/api/editions/${edition.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            <FileText size={15} /> Abrir PDF
          </a>
        }
      />

      {edition.pages.length === 0 && (
        <p className="rounded-lg border border-paper-200 bg-white p-6 text-sm text-slate-500">
          Esta edição ainda não tem texto. Rode o fluxo (▶) na lista de edições.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {edition.pages.map((p) => (
          <section key={p.page} className="rounded-xl border border-paper-200 bg-white p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-paper-100 pb-3">
              <h2 className="font-semibold text-brand-900">Página {p.page}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {p.revisedAt ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <Sparkles size={12} /> {p.revisedModel} · {formatDate(p.revisedAt)}
                  </span>
                ) : p.revisionError ? (
                  <span className="text-red-600" title={p.revisionError}>
                    IA falhou nesta página
                  </span>
                ) : (
                  <span>IA pendente</span>
                )}
                <a
                  href={`/api/editions/${edition.id}/file#page=${p.page}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:underline"
                >
                  ver no PDF
                </a>
              </div>
            </header>

            {p.revisedText ? (
              <Articles text={p.revisedText} />
            ) : (
              <p className="text-sm text-slate-400">
                {p.revisionError ? `Erro: ${p.revisionError.slice(0, 300)}` : "Ainda não transcrita pela IA."}
              </p>
            )}

            <details className="mt-4 rounded-lg bg-paper-50 p-3" open={!p.revisedText}>
              <summary className="cursor-pointer text-xs font-medium text-slate-500">Texto original do OCR</summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600">
                {p.text || "(vazio)"}
              </pre>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}
