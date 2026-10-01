"use client";

import { BookOpen } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import type { ArticleListRow } from "@/lib/entities/queries";

const fmt = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

/** Rows for one article kind's listing, each opening the edition at its page. */
export default function ArticleKindRows({ items }: { items: ArticleListRow[] }) {
  const { openEdition } = useEditionModal();

  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border border-paper-200 bg-white p-4">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{fmt(a.edition.publishedAt)}</span>
            <span>·</span>
            <span>
              {a.edition.editionNumber != null ? `Edição nº ${a.edition.editionNumber}` : a.edition.title}, pág.{" "}
              {a.page}
            </span>
          </div>
          <p className="font-medium text-slate-800">{a.title}</p>
          {a.summary && <p className="mt-0.5 text-sm text-slate-600">{a.summary}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => openEdition(a.edition.id, a.page)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              <BookOpen size={12} /> Ler no jornal
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
