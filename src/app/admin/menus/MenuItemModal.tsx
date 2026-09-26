"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import {
  createMenuItemAction,
  updateMenuItemAction,
  type ActionState,
} from "@/lib/actions/menu-actions";

type ParentOption = { id: number; label: string; depth: number };
type EditingItem = {
  id: number;
  label: string;
  url: string;
  parentId: number | null;
  openNewTab: boolean;
};

export default function MenuItemModal({
  menuId,
  item,
  parentOptions,
  onClose,
}: {
  menuId: number;
  /** Absent means "create"; present means "edit this item". */
  item?: EditingItem;
  parentOptions: ParentOption[];
  onClose: () => void;
}) {
  const action = item ? updateMenuItemAction : createMenuItemAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  const availableParents = parentOptions.filter((p) => p.id !== item?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-paper-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-900">
            {item ? "Editar item de menu" : "Novo item de menu"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3 px-4 py-4">
          <input type="hidden" name="menuId" value={menuId} />
          {item && <input type="hidden" name="id" value={item.id} />}

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Rótulo</span>
            <input
              name="label"
              type="text"
              required
              minLength={1}
              defaultValue={item?.label}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">URL</span>
            <input
              name="url"
              type="text"
              required
              placeholder="/pagina ou https://..."
              defaultValue={item?.url}
              className="rounded-lg border border-brand-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Item pai</span>
            <select
              name="parentId"
              defaultValue={item?.parentId != null ? String(item.parentId) : ""}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">Nenhum (item no topo)</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {"  ".repeat(p.depth)}
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs">
            <input
              name="openNewTab"
              type="checkbox"
              defaultChecked={item?.openNewTab}
              className="h-4 w-4 rounded border-brand-200"
            />
            <span className="font-medium text-slate-500">Abrir em nova aba</span>
          </label>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
