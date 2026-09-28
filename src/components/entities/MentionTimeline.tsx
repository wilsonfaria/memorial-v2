"use client";

import { BookOpen } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { KIND_LABEL, type ArticleKind } from "@/lib/entities/kinds";

export type TimelineItem = {
  id: number;
  surface: string;
  honorific: string | null;
  role: string | null;
  title: string;
  kind: string;
  summary: string;
  page: number;
  editionId: number;
  editionName: string;
  date: string; // ISO
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

/** Every mention of a person/place, grouped by year; each opens the edition at its page. */
export default function MentionTimeline({ items }: { items: TimelineItem[] }) {
  const { openEdition } = useEditionModal();
  const byYear = items.reduce((m, it) => {
    const y = new Date(it.date).getUTCFullYear();
    m.set(y, [...(m.get(y) ?? []), it]);
    return m;
  }, new Map<number, TimelineItem[]>());

  return (
    <ol className="relative border-l-2 border-paper-200 pl-6">
      {[...byYear].map(([year, list]) => (
        <li key={year} className="mb-8">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white bg-brand-500" aria-hidden />
          <h2 className="mb-3 font-display text-lg font-bold text-brand-900">{year}</h2>
          <ul className="flex flex-col gap-3">
            {list.map((it) => (
              <li key={it.id} className="rounded-xl border border-paper-200 bg-white p-4">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 font-medium text-accent-700">
                    {KIND_LABEL[it.kind as ArticleKind] ?? it.kind}
                  </span>
                  <span>{fmt(it.date)}</span>
                  <span>·</span>
                  <span>
                    {it.editionName}, pág. {it.page}
                  </span>
                </div>
                <p className="font-medium text-slate-800">{it.title}</p>
                {it.summary && <p className="mt-0.5 text-sm text-slate-600">{it.summary}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Citado como{" "}
                    <em className="not-italic text-slate-700">
                      {it.honorific ? `${it.honorific} ` : ""}
                      {it.surface}
                    </em>
                    {it.role && <> · {it.role}</>}
                  </p>
                  <button
                    type="button"
                    onClick={() => openEdition(it.editionId, it.page)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
                  >
                    <BookOpen size={12} /> Ler no jornal
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
