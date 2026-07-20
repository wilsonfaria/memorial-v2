"use client";

import { FileText } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { formatDate } from "@/lib/format";

export type EditionSummary = {
  id: number;
  title: string;
  publishedAt: Date;
  editionNumber: number | null;
};

export function EditionCard({ edition }: { edition: EditionSummary }) {
  const { openEdition } = useEditionModal();

  return (
    <button
      onClick={() => openEdition(edition.id)}
      className="group flex flex-col overflow-hidden rounded-xl border border-brand-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-brand-300"
    >
      <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-b from-brand-50 to-brand-100">
        <FileText size={40} className="text-brand-300 transition-colors group-hover:text-brand-500" />
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
      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-brand-200 hover:bg-brand-50"
    >
      <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-brand-100 text-brand-500">
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
