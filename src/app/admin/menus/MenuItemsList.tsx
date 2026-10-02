import Link from "next/link";
import { Plus } from "lucide-react";
import type { AdminMenuItemRow } from "@/lib/menu-repo";
import MenuItemRow from "./MenuItemRow";

export default function MenuItemsList({
  menuKey,
  items,
}: {
  menuKey: string;
  items: AdminMenuItemRow[];
}) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link
          href={`/admin/menus/novo?menu=${menuKey}`}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          <Plus size={13} />
          Novo item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-paper-300 bg-white py-10 text-center">
          <p className="text-sm text-slate-400">Nenhum item cadastrado ainda neste menu.</p>
          <Link
            href={`/admin/menus/novo?menu=${menuKey}`}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Adicionar o primeiro item
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} menuKey={menuKey} />
          ))}
        </div>
      )}
    </div>
  );
}
