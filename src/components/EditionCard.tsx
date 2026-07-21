"use client";

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { useInView } from "@/hooks/useInView";
import { formatDate } from "@/lib/format";

// pdfjs touches browser-only globals (DOMMatrix) at module load time,
// so this must never be evaluated during server-side rendering.
const PdfThumbnail = dynamic(() => import("@/components/PdfThumbnail"), { ssr: false });

export type EditionSummary = {
  id: number;
  title: string;
  publishedAt: Date;
  editionNumber: number | null;
};

export function EditionCard({ edition }: { edition: EditionSummary }) {
  const { openEdition } = useEditionModal();
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <button
      onClick={() => openEdition(edition.id)}
      className="group flex flex-col overflow-hidden rounded-none border border-paper-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-accent-300 hover:shadow-lg"
    >
      <div
        ref={ref}
        className="relative flex h-[259px] items-center justify-center overflow-hidden bg-gradient-to-b from-support-50 to-support-100"
      >
        {inView ? (
          <PdfThumbnail editionId={edition.id} width={220} />
        ) : (
          <FileText size={40} className="text-support-400 transition-colors group-hover:text-support-600" />
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-accent-700/85 via-accent-700/20 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-accent-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
            Abrir edição
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        <span className="text-sm font-medium text-slate-700 line-clamp-2">{edition.title}</span>
        <span className="text-xs text-slate-400">{formatDate(edition.publishedAt)}</span>
      </div>
    </button>
  );
}

export function EditionRow({ edition }: { edition: EditionSummary }) {
  const { openEdition } = useEditionModal();

  return (
    <button
      onClick={() => openEdition(edition.id)}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-accent-200 hover:bg-accent-50"
    >
      <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-brand-100 text-brand-500 transition-colors group-hover:bg-accent-100 group-hover:text-accent-600">
        <FileText size={16} />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{edition.title}</span>
      {edition.editionNumber && (
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">nº {edition.editionNumber}</span>
      )}
      <span className="shrink-0 text-xs text-slate-400">{formatDate(edition.publishedAt)}</span>
    </button>
  );
}
