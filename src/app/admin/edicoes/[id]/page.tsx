import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import PageReview from "./PageReview";

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
        select: {
          page: true,
          text: true,
          revisedText: true,
          revisedModel: true,
          revisedAt: true,
          revisionError: true,
          verifiedAt: true,
          verifiedBy: true,
        },
      },
    },
  });
  if (!edition) notFound();

  const name = edition.editionNumber != null ? `Edição nº ${edition.editionNumber}` : edition.title;
  const revised = edition.pages.filter((p) => p.revisedAt).length;
  const verified = edition.pages.filter((p) => p.verifiedAt).length;

  return (
    <div>
      <Link href="/admin/edicoes" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} /> Edições
      </Link>
      <PageHeader
        title={`Transcrição · ${name}`}
        description={`${formatDate(edition.publishedAt)} · ${revised} de ${edition.pages.length} página(s) transcritas pela IA · ${verified} conferida(s). "Conferir" confirma que o texto está certo; "Corrigir" abre a página digitalizada ao lado do texto. Páginas conferidas formam o gabarito que mede a qualidade de cada modelo.`}
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
          <PageReview
            key={p.page}
            editionId={edition.id}
            p={{
              ...p,
              revisedAt: p.revisedAt?.toISOString() ?? null,
              verifiedAt: p.verifiedAt?.toISOString() ?? null,
            }}
          />
        ))}
      </div>
    </div>
  );
}
