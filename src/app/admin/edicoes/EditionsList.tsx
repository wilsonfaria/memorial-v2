"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { bulkDeleteEditionsAction, deleteEditionAction } from "@/lib/actions/edition-actions";
import { formatDate, formatFileSize } from "@/lib/format";

type EditionRow = {
  id: number;
  title: string;
  publishedAt: Date;
  fileSizeBytes: number | null;
  editionNumber: number | null;
  month: { year: { year: number; decade: { label: string } } };
};

export default function EditionsList({ editions }: { editions: EditionRow[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = editions.length > 0 && selected.size === editions.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(editions.map((e) => e.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Remover ${selected.size} edição(ões) selecionada(s)? Os PDFs serão apagados permanentemente.`)) {
      return;
    }
    startTransition(async () => {
      const result = await bulkDeleteEditionsAction(Array.from(selected));
      setMessage(result?.error ?? result?.success ?? null);
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-brand-200"
          />
          Selecionar todas ({editions.length})
        </label>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 size={13} />
            {isPending ? "Removendo..." : `Remover ${selected.size} selecionada(s)`}
          </button>
        )}
      </div>

      {message && <p className="mb-1 text-xs text-slate-500">{message}</p>}

      {editions.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">Nenhuma edição encontrada com esses filtros.</p>
      )}

      {editions.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5"
        >
          <input
            type="checkbox"
            checked={selected.has(e.id)}
            onChange={() => toggleOne(e.id)}
            className="h-4 w-4 shrink-0 rounded border-brand-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{e.title}</p>
            <p className="text-xs text-slate-400">
              {formatDate(e.publishedAt)} · {e.month.year.decade.label}s / {e.month.year.year} ·{" "}
              {formatFileSize(e.fileSizeBytes)}
              {e.editionNumber ? ` · nº ${e.editionNumber}` : ""}
            </p>
          </div>
          <form
            action={deleteEditionAction}
            onSubmit={(ev) => {
              if (!window.confirm(`Remover a edição "${e.title}"? O PDF será apagado permanentemente.`)) {
                ev.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={e.id} />
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Remover"
            >
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
