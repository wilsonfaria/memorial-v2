import Link from "next/link";
import { getAdminMenu, MENU_SLOTS, type MenuSlotKey } from "@/lib/menu-repo";
import PageHeader from "@/components/admin/PageHeader";
import MenuItemsList from "./MenuItemsList";

export const dynamic = "force-dynamic";

function isMenuSlotKey(value: string): value is MenuSlotKey {
  return MENU_SLOTS.some((slot) => slot.key === value);
}

export default async function AdminMenusPage({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string }>;
}) {
  const params = await searchParams;
  const activeKey = params.menu && isMenuSlotKey(params.menu) ? params.menu : MENU_SLOTS[0].key;
  const activeSlot = MENU_SLOTS.find((slot) => slot.key === activeKey)!;

  const { items } = await getAdminMenu(activeSlot.key, activeSlot.name);

  return (
    <>
      <PageHeader
        title="Menus"
        description="Monte os links de navegação do site. Um item com filhos vira um submenu (de um único nível) no cabeçalho ou no rodapé."
      />

      <div className="mb-6 flex gap-1 border-b border-paper-200">
        {MENU_SLOTS.map((slot) => (
          <Link
            key={slot.key}
            href={`/admin/menus?menu=${slot.key}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              slot.key === activeKey
                ? "border-b-2 border-brand-600 text-brand-900"
                : "text-slate-500 hover:text-brand-700"
            }`}
          >
            {slot.name}
          </Link>
        ))}
      </div>

      <MenuItemsList menuKey={activeKey} items={items} />
    </>
  );
}
