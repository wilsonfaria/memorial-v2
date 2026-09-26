"use client";

import { useTransition } from "react";
import { Trash } from "lucide-react";
import { emptyTrashAction } from "@/lib/actions/trash-actions";

export default function EmptyTrashButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Excluir definitivamente ${count} item(ns) da lixeira? Esta ação não pode ser desfeita.`)) {
      return;
    }
    startTransition(() => emptyTrashAction());
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      <Trash size={13} />
      {isPending ? "Esvaziando..." : "Esvaziar lixeira"}
    </button>
  );
}
