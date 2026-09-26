"use client";

import { Newspaper } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { formatDate } from "@/lib/format";
import type { OnThisDayEdition } from "@/lib/data";

export default function OnThisDayCard({ edition }: { edition: OnThisDayEdition }) {
  const { openEdition } = useEditionModal();

  return (
    <button
      onClick={() => openEdition(edition.id)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-paper-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-accent-300 hover:shadow-lg"
    >
      <span className="absolute left-2 top-2 z-10 rounded-full bg-brand-900/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        Há {edition.yearsAgo} {edition.yearsAgo === 1 ? "ano" : "anos"}
      </span>

      <div className="relative flex h-[259px] items-center justify-center overflow-hidden bg-gradient-to-b from-support-50 to-support-100">
        {edition.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from a persistent storage path outside /public, not optimizable by next/image
          <img
            src={`/api/uploads/${edition.thumbnailPath}`}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <Newspaper size={40} className="text-support-400 transition-colors group-hover:text-support-600" />
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
