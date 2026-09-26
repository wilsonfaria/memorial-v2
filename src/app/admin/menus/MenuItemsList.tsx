"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminMenuItemRow } from "@/lib/menu-repo";
import MenuItemRow from "./MenuItemRow";
import MenuItemModal from "./MenuItemModal";

type ParentOption = { id: number; label: string; depth: number };

export default function MenuItemsList({
  menuId,
  items,
  parentOptions,
}: {
  menuId: number;
  items: AdminMenuItemRow[];
  parentOptions: ParentOption[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          <Plus size={13} />
          Novo item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-paper-300 bg-white py-10 text-center">
          <p className="text-sm text-slate-400">Nenhum item cadastrado ainda neste menu.</p>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Adicionar o primeiro item
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} menuId={menuId} parentOptions={parentOptions} />
          ))}
        </div>
      )}

      {creating && (
        <MenuItemModal menuId={menuId} parentOptions={parentOptions} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
