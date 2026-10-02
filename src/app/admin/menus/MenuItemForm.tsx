"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createMenuItemAction, updateMenuItemAction, type ActionState } from "@/lib/actions/menu-actions";

type ParentOption = { id: number; label: string; depth: number };
type EditingItem = { id: number; label: string; url: string; parentId: number | null; openNewTab: boolean };

export default function MenuItemForm({
  menuId,
  item,
  parentOptions,
  backHref,
}: {
  menuId: number;
  item?: EditingItem;
  parentOptions: ParentOption[];
  backHref: string;
}) {
  const action = item ? updateMenuItemAction : createMenuItemAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const availableParents = parentOptions.filter((parent) => parent.id !== item?.id);

  return (
    <form action={formAction} className="flex max-w-4xl flex-col gap-5">
      <input type="hidden" name="menuId" value={menuId} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-600">Rótulo</span>
          <input name="label" required minLength={1} defaultValue={item?.label} className="rounded-lg border border-brand-200 px-3 py-2.5 outline-none focus:border-brand-400" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-600">Item pai</span>
          <select name="parentId" defaultValue={item?.parentId != null ? String(item.parentId) : ""} className="rounded-lg border border-brand-200 px-3 py-2.5 outline-none focus:border-brand-400">
            <option value="">Nenhum (item no topo)</option>
            {availableParents.map((parent) => (
              <option key={parent.id} value={parent.id}>{"  ".repeat(parent.depth)}{parent.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-600">URL</span>
        <input name="url" required placeholder="/pagina ou https://..." defaultValue={item?.url} className="rounded-lg border border-brand-200 px-3 py-2.5 font-mono outline-none focus:border-brand-400" />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input name="openNewTab" type="checkbox" defaultChecked={item?.openNewTab} className="h-4 w-4 rounded border-brand-200" />
        Abrir em nova aba
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="flex flex-wrap gap-2 border-t border-paper-200 pt-4">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <Link href={backHref} className="rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-brand-800">Fechar</Link>
      </div>
    </form>
  );
}
