import { prisma } from "@/lib/prisma";

export const MENU_SLOTS = [
  { key: "principal", name: "Menu Principal" },
  { key: "rodape", name: "Menu de Rodapé" },
] as const;

export type MenuSlotKey = (typeof MENU_SLOTS)[number]["key"];

export type MenuItemRow = {
  id: number;
  menuId: number;
  parentId: number | null;
  label: string;
  url: string;
  sortOrder: number;
  openNewTab: boolean;
};

export type MenuItemNode = MenuItemRow & { children: MenuItemNode[] };

/** Only used by the admin list, which shows depth and up/down affordances without nested <ul> markup. */
export type AdminMenuItemRow = MenuItemRow & {
  depth: number;
  siblingIndex: number;
  siblingCount: number;
};

/** One level deep, matching what the public Header/Footer actually render. */
export type PublicMenuItem = {
  id: number;
  label: string;
  url: string;
  openNewTab: boolean;
  children: { id: number; label: string; url: string; openNewTab: boolean }[];
};

export async function getOrCreateMenu(key: string, name: string) {
  const existing = await prisma.menu.findUnique({ where: { key } });
  if (existing) return existing;
  return prisma.menu.create({ data: { key, name } });
}

async function listMenuItemsFlat(menuId: number): Promise<MenuItemRow[]> {
  return prisma.menuItem.findMany({
    where: { menuId },
    // MySQL/MariaDB sort NULL first in ascending order, so this naturally
    // groups top-level items before children of any given parent.
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });
}

function buildTree(rows: MenuItemRow[]): MenuItemNode[] {
  const byId = new Map<number, MenuItemNode>();
  for (const row of rows) byId.set(row.id, { ...row, children: [] });

  const roots: MenuItemNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function flattenForAdmin(nodes: MenuItemNode[], depth = 0): AdminMenuItemRow[] {
  const out: AdminMenuItemRow[] = [];
  nodes.forEach((node, siblingIndex) => {
    const { children, ...row } = node;
    out.push({ ...row, depth, siblingIndex, siblingCount: nodes.length });
    out.push(...flattenForAdmin(children, depth + 1));
  });
  return out;
}

function toPublicTree(nodes: MenuItemNode[]): PublicMenuItem[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    url: node.url,
    openNewTab: node.openNewTab,
    children: node.children.map((child) => ({
      id: child.id,
      label: child.label,
      url: child.url,
      openNewTab: child.openNewTab,
    })),
  }));
}

/** Public rendering entry point: resolves the menu by key and returns a one-level-deep tree. Returns [] if the slot has never been visited in the admin (menu row doesn't exist yet). */
export async function listMenuItems(menuKey: string): Promise<PublicMenuItem[]> {
  const menu = await prisma.menu.findUnique({ where: { key: menuKey } });
  if (!menu) return [];
  const rows = await listMenuItemsFlat(menu.id);
  return toPublicTree(buildTree(rows));
}

/** Admin entry point: lazily creates the menu, then returns both the flat (depth-annotated) rows for the list and the raw rows for building "choose a parent" dropdowns. */
export async function getAdminMenu(key: string, name: string) {
  const menu = await getOrCreateMenu(key, name);
  const rows = await listMenuItemsFlat(menu.id);
  return { menu, rows, items: flattenForAdmin(buildTree(rows)) };
}

export async function createMenuItem(data: {
  menuId: number;
  parentId: number | null;
  label: string;
  url: string;
  openNewTab: boolean;
}) {
  const max = await prisma.menuItem.aggregate({
    where: { menuId: data.menuId, parentId: data.parentId },
    _max: { sortOrder: true },
  });
  return prisma.menuItem.create({
    data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
}

export async function updateMenuItem(
  id: number,
  data: { parentId: number | null; label: string; url: string; openNewTab: boolean }
) {
  return prisma.menuItem.update({ where: { id }, data });
}

export async function deleteMenuItem(id: number) {
  return prisma.menuItem.delete({ where: { id } });
}
