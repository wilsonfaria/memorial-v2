import Link from "next/link";
import { ChevronUp, ChevronDown, Pencil, ExternalLink } from "lucide-react";
import {
  deleteMenuItemAction,
  moveMenuItemUpAction,
  moveMenuItemDownAction,
} from "@/lib/actions/menu-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import type { AdminMenuItemRow } from "@/lib/menu-repo";

export default function MenuItemRow({
  item,
  menuKey,
}: {
  item: AdminMenuItemRow;
  menuKey: string;
}) {
  const isFirst = item.siblingIndex === 0;
  const isLast = item.siblingIndex === item.siblingCount - 1;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5"
      style={{ marginLeft: item.depth * 24 }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {item.label}
          {item.openNewTab && (
            <ExternalLink size={11} className="ml-1.5 inline text-slate-400" />
          )}
        </p>
        <p className="truncate font-mono text-xs text-slate-400">{item.url}</p>
      </div>
      <div className="flex items-center gap-1">
        <form action={moveMenuItemUpAction}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            disabled={isFirst}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-30"
            title="Mover para cima"
          >
            <ChevronUp size={14} />
          </button>
        </form>
        <form action={moveMenuItemDownAction}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            disabled={isLast}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-30"
            title="Mover para baixo"
          >
            <ChevronDown size={14} />
          </button>
        </form>
        <Link
          href={`/admin/menus/${item.id}?menu=${menuKey}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
          title="Editar"
        >
          <Pencil size={13} />
        </Link>
        <DeleteButton
          action={deleteMenuItemAction}
          id={item.id}
          confirmMessage={`Remover o item "${item.label}"? Os itens filhos dele também serão removidos.`}
        />
      </div>
    </div>
  );
}
