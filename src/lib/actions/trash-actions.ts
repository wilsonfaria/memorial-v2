"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  restoreTrashedItem,
  purgeTrashedItem,
  getTrashedItems,
  type TrashResource,
  TRASH_ADMIN_PATH,
} from "@/lib/trash";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

function revalidateResource(resource: TrashResource) {
  revalidatePath("/admin/lixeira");
  revalidatePath(TRASH_ADMIN_PATH[resource]);
  revalidatePath("/", "layout");
}

export async function restoreItemAction(resource: TrashResource, id: number) {
  await requireSession();
  await restoreTrashedItem(resource, id);
  revalidateResource(resource);
}

export async function purgeItemAction(resource: TrashResource, id: number) {
  await requireSession();
  await purgeTrashedItem(resource, id);
  revalidateResource(resource);
}

export async function emptyTrashAction() {
  await requireSession();
  const items = await getTrashedItems();
  await Promise.all(items.map((item) => purgeTrashedItem(item.resource, item.id)));
  revalidatePath("/admin/lixeira");
  revalidatePath("/", "layout");
}
