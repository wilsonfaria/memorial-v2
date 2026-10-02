import { notFound } from "next/navigation";
import { getAdminMenu, MENU_SLOTS, type MenuSlotKey } from "@/lib/menu-repo";
import AdminEditPage from "@/components/admin/AdminEditPage";
import MenuItemForm from "../MenuItemForm";

function menuKey(value?: string): MenuSlotKey | null {
  return MENU_SLOTS.some((slot) => slot.key === value) ? (value as MenuSlotKey) : null;
}

export default async function EditMenuItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ menu?: string }> }) {
  const [{ id }, { menu: rawMenu }] = await Promise.all([params, searchParams]);
  const key = menuKey(rawMenu);
  if (!key) notFound();
  const slot = MENU_SLOTS.find((entry) => entry.key === key)!;
  const { menu, items } = await getAdminMenu(key, slot.name);
  const item = items.find((entry) => entry.id === Number(id));
  if (!item) notFound();
  const parents = items.map((entry) => ({ id: entry.id, label: entry.label, depth: entry.depth }));
  const backHref = `/admin/menus?menu=${key}`;

  return (
    <AdminEditPage title={`Editar item: ${item.label}`} backHref={backHref}>
      <MenuItemForm menuId={menu.id} item={item} parentOptions={parents} backHref={backHref} />
    </AdminEditPage>
  );
}
