"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreItemAction, purgeItemAction } from "@/lib/actions/trash-actions";
import { TRASH_LABELS, TRASH_RETENTION_DAYS, type TrashedItem } from "@/lib/trash-shared";
import { formatDate } from "@/lib/format";

export default function TrashRow({ item }: { item: TrashedItem }) {
  const [isPending, startTransition] = useTransition();

  const expiresAt = new Date(item.deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  function restore() {
    startTransition(() => restoreItemAction(item.resource, item.id));
  }

  function purge() {
    if (
      !window.confirm(
        `Excluir definitivamente "${item.title}"? Esta ação não pode ser desfeita — arquivos associados (PDF, imagens) também serão apagados.`
      )
    ) {
      return;
    }
    startTransition(() => purgeItemAction(item.resource, item.id));
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
        {TRASH_LABELS[item.resource]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{item.title}</p>
        <p className="text-xs text-slate-400">
          Excluído em {formatDate(item.deletedAt)} · {daysLeft === 0 ? "expira hoje" : `expira em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={restore}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100 disabled:opacity-60"
          title="Restaurar"
        >
          <RotateCcw size={13} />
          Restaurar
        </button>
        <button
          onClick={purge}
          disabled={isPending}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          title="Excluir definitivamente"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
