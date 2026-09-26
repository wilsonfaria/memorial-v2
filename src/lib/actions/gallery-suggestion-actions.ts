"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type SuggestionActionState = { error?: string; success?: string } | undefined;

/** Public, unauthenticated: any visitor can suggest who/what is in a gallery photo. Held for admin review. */
export async function suggestPhotoCaptionAction(
  _prevState: SuggestionActionState,
  formData: FormData
): Promise<SuggestionActionState> {
  const photoId = Number(formData.get("photoId"));
  const suggestion = String(formData.get("suggestion") ?? "").trim();
  const submitterName = String(formData.get("submitterName") ?? "").trim();

  if (!photoId) return { error: "Foto inválida." };
  if (suggestion.length < 3) return { error: "Escreva um pouco mais sobre a foto." };
  if (suggestion.length > 500) return { error: "Texto muito longo (máximo 500 caracteres)." };

  const photo = await prisma.galleryPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return { error: "Foto não encontrada." };

  await prisma.photoCaptionSuggestion.create({
    data: { photoId, suggestion, submitterName: submitterName || null },
  });

  return { success: "Obrigado! Sua sugestão foi enviada para revisão." };
}

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function approveCaptionSuggestionAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const suggestion = await prisma.photoCaptionSuggestion.findUnique({ where: { id } });
  if (!suggestion) return;

  await prisma.$transaction([
    prisma.galleryPhoto.update({ where: { id: suggestion.photoId }, data: { caption: suggestion.suggestion } }),
    prisma.photoCaptionSuggestion.update({ where: { id }, data: { status: "approved" } }),
  ]);

  revalidatePath("/admin/galeria/sugestoes");
  revalidatePath("/galeria");
}

export async function rejectCaptionSuggestionAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.photoCaptionSuggestion.update({ where: { id }, data: { status: "rejected" } }).catch(() => {});

  revalidatePath("/admin/galeria/sugestoes");
}
