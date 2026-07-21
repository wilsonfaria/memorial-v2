"use client";

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { useInView } from "@/hooks/useInView";
import { formatDate, formatFileSize } from "@/lib/format";
import type { EditionSummary } from "@/components/EditionCard";

const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });

type EditionResultSummary = EditionSummary & { fileSizeBytes: number | null };

export default function EditionResultRow({ edition }: { edition: EditionResultSummary }) {
  const { openEdition } = useEditionModal();
  const { ref, inView } = useInView<HTMLButtonElement>();

  return (
    <div className="flex items-center gap-3 border-b border-paper-200 py-1.5 first:pt-0 last:border-b-0">
      <button
        onClick={() => openEdition(edition.id)}
        ref={ref}
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-b from-support-50 to-support-100"
      >
        {inView ? (
          <PdfThumbnail editionId={edition.id} width={36} />
        ) : (
          <FileText size={16} className="text-support-400" />
        )}
      </button>

      <button
        onClick={() => openEdition(edition.id)}
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-brand-700 hover:underline"
      >
        {edition.title}
      </button>

      <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
        {formatDate(edition.publishedAt)}
        {edition.editionNumber ? ` · nº ${edition.editionNumber}` : ""}
        {edition.fileSizeBytes ? ` · ${formatFileSize(edition.fileSizeBytes)}` : ""}
      </span>

      <button
        onClick={() => openEdition(edition.id)}
        className="shrink-0 text-xs font-medium text-accent-600 hover:underline"
      >
        Mostrar mais
      </button>
    </div>
  );
}
