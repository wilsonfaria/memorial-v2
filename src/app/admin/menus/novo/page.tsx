import { notFound } from "next/navigation";
import { getAdminMenu, MENU_SLOTS, type MenuSlotKey } from "@/lib/menu-repo";
import AdminEditPage from "@/components/admin/AdminEditPage";
import MenuItemForm from "../MenuItemForm";

function menuKey(value?: string): MenuSlotKey | null {
  return MENU_SLOTS.some((slot) => slot.key === value) ? (value as MenuSlotKey) : null;
}

export default async function NewMenuItemPage({ searchParams }: { searchParams: Promise<{ menu?: string }> }) {
  const { menu: rawMenu } = await searchParams;
  const key = menuKey(rawMenu);
  if (!key) notFound();
  const slot = MENU_SLOTS.find((entry) => entry.key === key)!;
  const { menu, items } = await getAdminMenu(key, slot.name);
  const parents = items.map((item) => ({ id: item.id, label: item.label, depth: item.depth }));
  const backHref = `/admin/menus?menu=${key}`;

  return (
    <AdminEditPage title={`Novo item — ${slot.name}`} backHref={backHref}>
      <MenuItemForm menuId={menu.id} parentOptions={parents} backHref={backHref} />
    </AdminEditPage>
  );
}
