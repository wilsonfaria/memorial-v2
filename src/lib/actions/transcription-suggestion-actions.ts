"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { approveSuggestion, createSuggestion, rejectSuggestion } from "@/lib/transcription-suggestions";

export type TranscriptionSuggestionState = { error?: string; success?: string } | undefined;

/** Public, unauthenticated: a visitor's reading of one "[ilegível]" passage. Held for admin review. */
export async function suggestTranscriptionAction(
  _prevState: TranscriptionSuggestionState,
  formData: FormData
): Promise<TranscriptionSuggestionState> {
  // Honeypot: a real visitor never fills this hidden field; a bot filling every field will.
  if (String(formData.get("website") ?? "").trim()) return { success: "Obrigado! Sua sugestão foi enviada para revisão." };

  const ip = await getClientIp();
  // A reader fixing several gaps on a page stays well under this; a bot doesn't.
  if (!consumeRateLimit(`transcription-suggestion:${ip}`, 20, 10 * 60 * 1000)) {
    return { error: "Muitas sugestões enviadas em pouco tempo. Tente novamente mais tarde." };
  }

  const editionId = Number(formData.get("editionId"));
  const page = Number(formData.get("page"));
  const occurrence = Number(formData.get("occurrence"));
  if (![editionId, page].every((n) => Number.isInteger(n) && n > 0) || !Number.isInteger(occurrence) || occurrence < 0) {
    return { error: "Trecho inválido." };
  }

  const r = await createSuggestion({
    editionId,
    page,
    occurrence,
    seenBefore: String(formData.get("seenBefore") ?? ""),
    reading: String(formData.get("reading") ?? ""),
    submitterName: String(formData.get("submitterName") ?? ""),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/edicoes/sugestoes");
  return { success: "Obrigado! Sua sugestão foi enviada para revisão." };
}

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function approveTranscriptionSuggestionAction(id: number): Promise<{ error?: string }> {
  const session = await requireSession();
  const r = await approveSuggestion(Number(id), session.username);
  revalidatePath("/admin/edicoes/sugestoes");
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/edicoes/${r.editionId}`);
  return {};
}

export async function rejectTranscriptionSuggestionAction(id: number) {
  const session = await requireSession();
  await rejectSuggestion(Number(id), session.username);
  revalidatePath("/admin/edicoes/sugestoes");
}
