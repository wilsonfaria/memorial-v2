"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/menu-repo";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

function revalidateMenus() {
  revalidatePath("/admin/menus");
  revalidatePath("/", "layout");
}

function parseParentId(formData: FormData): number | null {
  const raw = String(formData.get("parentId") ?? "").trim();
  return raw ? Number(raw) : null;
}

/** Walks the parent chain from `startId` and returns true if `targetId` is reached (i.e. targetId is an ancestor of startId, so setting startId's parent to targetId's own descendant chain would create a cycle). */
async function wouldCreateCycle(itemId: number, proposedParentId: number): Promise<boolean> {
  if (proposedParentId === itemId) return true;
  let cursor: number | null = proposedParentId;
  while (cursor != null) {
    if (cursor === itemId) return true;
    const parent: { parentId: number | null } | null = await prisma.menuItem.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }
  return false;
}

export async function createMenuItemAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const menuId = Number(formData.get("menuId"));
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const openNewTab = formData.get("openNewTab") === "on";
  const parentId = parseParentId(formData);

  if (!menuId) return { error: "Menu inválido." };
  if (label.length < 1) return { error: "Informe um rótulo para o item." };
  if (url.length < 1) return { error: "Informe um endereço (URL) para o item." };

  if (parentId != null) {
    const parent = await prisma.menuItem.findUnique({ where: { id: parentId } });
    if (!parent || parent.menuId !== menuId) return { error: "Item pai inválido." };
  }

  await createMenuItem({ menuId, parentId, label, url, openNewTab });

  revalidateMenus();
  return { success: "Item de menu criado com sucesso." };
}

export async function updateMenuItemAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const openNewTab = formData.get("openNewTab") === "on";
  const parentId = parseParentId(formData);

  if (label.length < 1) return { error: "Informe um rótulo para o item." };
  if (url.length < 1) return { error: "Informe um endereço (URL) para o item." };

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) return { error: "Item de menu não encontrado." };

  if (parentId != null) {
    if (await wouldCreateCycle(id, parentId)) {
      return { error: "Não é possível definir um descendente (ou o próprio item) como pai." };
    }
    const parent = await prisma.menuItem.findUnique({ where: { id: parentId } });
    if (!parent || parent.menuId !== existing.menuId) return { error: "Item pai inválido." };
  }

  await updateMenuItem(id, { parentId, label, url, openNewTab });

  revalidateMenus();
  return { success: "Item de menu atualizado com sucesso." };
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await deleteMenuItem(id);
  revalidateMenus();
}

async function getSiblings(menuId: number, parentId: number | null) {
  return prisma.menuItem.findMany({
    where: { menuId, parentId },
    orderBy: { sortOrder: "asc" },
  });
}

async function swapSortOrder(a: { id: number; sortOrder: number }, b: { id: number; sortOrder: number }) {
  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.menuItem.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
}

export async function moveMenuItemUpAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return;

  const siblings = await getSiblings(item.menuId, item.parentId);
  const index = siblings.findIndex((s) => s.id === id);
  if (index > 0) await swapSortOrder(siblings[index], siblings[index - 1]);

  revalidateMenus();
}

export async function moveMenuItemDownAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return;

  const siblings = await getSiblings(item.menuId, item.parentId);
  const index = siblings.findIndex((s) => s.id === id);
  if (index >= 0 && index < siblings.length - 1) await swapSortOrder(siblings[index], siblings[index + 1]);

  revalidateMenus();
}
