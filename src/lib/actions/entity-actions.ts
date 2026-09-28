"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { refreshEntities } from "@/lib/entities/extract";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

type Result = { ok: true } | { ok: false; error: string };

/**
 * Hides a person/place from the public pages (LGPD request) or shows it again.
 * The note records who asked and when; the row stays so re-extraction keeps it hidden.
 */
export async function setEntityHiddenAction(id: number, hidden: boolean, note: string): Promise<Result> {
  await requireSession();
  const hiddenNote = String(note ?? "").trim().slice(0, 2000);
  if (hidden && hiddenNote.length < 3) return { ok: false, error: "Anote quem pediu e quando." };
  const { count } = await prisma.entity.updateMany({
    where: { id: Number(id) },
    data: hidden ? { hidden: true, hiddenAt: new Date(), hiddenNote } : { hidden: false, hiddenAt: null, hiddenNote: null },
  });
  if (count === 0) return { ok: false, error: "Ficha não encontrada." };
  // Shown again with no mention left (its pages were re-extracted without it) → dropped like any other.
  if (!hidden) await refreshEntities([Number(id)]);
  revalidatePath("/admin/pessoas");
  revalidatePath("/pessoas", "layout");
  revalidatePath("/lugares", "layout");
  return { ok: true };
}
