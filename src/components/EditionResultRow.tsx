"use client";

import { Newspaper } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { formatDate, formatFileSize } from "@/lib/format";
import { snippetTerms, splitSnippet } from "@/lib/search/highlight";
import type { EditionSummary } from "@/components/EditionCard";

type EditionResultSummary = EditionSummary & {
  fileSizeBytes: number | null;
  /** Text-search hit: snippet with highlight markers (see lib/search/highlight) and the page it's on. */
  matchSnippet?: string;
  matchPage?: number;
};

export default function EditionResultRow({ edition }: { edition: EditionResultSummary }) {
  const { openEdition } = useEditionModal();
  // The words the search matched on that page, to highlight them on the page image.
  const open = () =>
    openEdition(edition.id, edition.matchPage, edition.matchSnippet ? snippetTerms(edition.matchSnippet) : undefined);

  return (
    <div className="flex flex-col gap-1 border-b border-paper-200 py-1.5 first:pt-0 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          onClick={open}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-b from-support-50 to-support-100"
        >
          {edition.thumbnailPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from a persistent storage path outside /public, not optimizable by next/image
            <img
              src={`/api/uploads/${edition.thumbnailPath}`}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <Newspaper size={16} className="text-support-400" />
          )}
        </button>

        <button onClick={open} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-brand-700 hover:underline">
          {edition.title}
        </button>

        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
          {formatDate(edition.publishedAt)}
          {edition.editionNumber ? ` · nº ${edition.editionNumber}` : ""}
          {edition.fileSizeBytes ? ` · ${formatFileSize(edition.fileSizeBytes)}` : ""}
        </span>

        <button onClick={open} className="shrink-0 text-xs font-medium text-accent-600 hover:underline">
          {edition.matchPage ? `Abrir na pág. ${edition.matchPage}` : "Mostrar mais"}
        </button>
      </div>

      {edition.matchSnippet && (
        <button
          onClick={open}
          className="ml-12 line-clamp-2 text-left text-xs leading-relaxed text-slate-500 hover:text-slate-700"
        >
          {edition.matchPage && <span className="mr-1.5 font-semibold text-slate-400">pág. {edition.matchPage}</span>}
          {splitSnippet(edition.matchSnippet).map((part, i) =>
            part.hit ? (
              <mark key={i} className="rounded bg-accent-100 px-0.5 font-medium text-accent-900">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </button>
      )}
    </div>
  );
}
