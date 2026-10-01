"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ARTICLE_KINDS, isPrivateKind } from "@/lib/entities/kinds";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

type Result = { ok: true } | { ok: false; error: string };

/**
 * Hides/shows an article kind from the public site (/materias, person/place
 * mentions). The transcription and the PDF are untouched — this only
 * controls what the structured-extraction views show. LGPD kinds
 * (PRIVATE_KINDS) are a fixed floor and can't be toggled here.
 */
export async function setKindHiddenAction(kind: string, hidden: boolean): Promise<Result> {
  await requireSession();
  if (!(ARTICLE_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Tipo inválido." };
  if (isPrivateKind(kind)) return { ok: false, error: "Este tipo é sempre oculto (LGPD) e não pode ser alterado." };

  if (hidden) {
    await prisma.hiddenArticleKind.upsert({ where: { kind }, create: { kind }, update: {} });
  } else {
    await prisma.hiddenArticleKind.deleteMany({ where: { kind } });
  }

  revalidatePath("/admin/materias");
  revalidatePath("/materias", "layout");
  revalidatePath("/pessoas", "layout");
  revalidatePath("/lugares", "layout");
  return { ok: true };
}
