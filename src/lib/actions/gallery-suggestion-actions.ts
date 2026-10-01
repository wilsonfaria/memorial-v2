"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateCaptionSuggestion } from "@/lib/gallery-suggestions";

export type SuggestionActionState = { error?: string; success?: string } | undefined;

/** Public, unauthenticated: any visitor can suggest who/what is in a gallery photo. Held for admin review. */
export async function suggestPhotoCaptionAction(
  _prevState: SuggestionActionState,
  formData: FormData
): Promise<SuggestionActionState> {
  // Honeypot: a real visitor never fills this hidden field; a bot filling every field will.
  if (String(formData.get("website") ?? "").trim()) {
    return { success: "Obrigado! Sua sugestão foi enviada para revisão." };
  }
  const ip = await getClientIp();
  if (!consumeRateLimit(`caption-suggestion:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Muitas sugestões enviadas em pouco tempo. Tente novamente mais tarde." };
  }

  const photoId = Number(formData.get("photoId"));
  const submitterName = String(formData.get("submitterName") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (!Number.isInteger(photoId) || photoId <= 0) return { error: "Foto inválida." };
  const valid = validateCaptionSuggestion(String(formData.get("suggestion") ?? ""));
  if ("error" in valid) return { error: valid.error };

  // Only photos the public can actually see.
  const photo = await prisma.galleryPhoto.findFirst({
    where: { id: photoId, album: { published: true, deletedAt: null } },
    select: { id: true },
  });
  if (!photo) return { error: "Foto não encontrada." };

  const duplicate = await prisma.photoCaptionSuggestion.findFirst({
    where: { photoId, suggestion: valid.suggestion, status: "pending" },
    select: { id: true },
  });
  if (!duplicate) {
    await prisma.photoCaptionSuggestion.create({
      data: { photoId, suggestion: valid.suggestion, submitterName: submitterName || null },
    });
    revalidatePath("/admin/galeria/sugestoes");
  }

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
