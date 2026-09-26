"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

export async function createMilestoneAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const year = Number(formData.get("year"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";

  if (!Number.isInteger(year) || year < 1000 || year > 3000) return { error: "Informe um ano válido." };
  if (title.length < 2) return { error: "Informe um título curto para o marco." };

  await prisma.timelineMilestone.create({
    data: { year, title, description: description || null, order, published },
  });

  revalidatePath("/admin/linha-do-tempo");
  revalidatePath("/", "layout");
  return { success: "Marco criado com sucesso." };
}

export async function updateMilestoneAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const year = Number(formData.get("year"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";

  if (!Number.isInteger(year) || year < 1000 || year > 3000) return { error: "Informe um ano válido." };
  if (title.length < 2) return { error: "Informe um título curto para o marco." };

  const existing = await prisma.timelineMilestone.findUnique({ where: { id } });
  if (!existing) return { error: "Marco não encontrado." };

  await prisma.timelineMilestone.update({
    where: { id },
    data: { year, title, description: description || null, order, published },
  });

  revalidatePath("/admin/linha-do-tempo");
  revalidatePath("/", "layout");
  return { success: "Marco atualizado com sucesso." };
}

/** Moves the milestone to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteMilestoneAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await prisma.timelineMilestone.updateMany({ where: { id }, data: { deletedAt: new Date() } });

  revalidatePath("/admin/linha-do-tempo");
  revalidatePath("/", "layout");
}
