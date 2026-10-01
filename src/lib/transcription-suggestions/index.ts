import { prisma } from "@/lib/prisma";
import { clearPageExtraction } from "@/lib/entities/extract";
import { reindexFromDatabase } from "@/lib/search/indexer";
import { applyReading, findMarkers, locateMarker, seenBeforeMatches, squash, validateReading } from "./markers";

/**
 * Visitor corrections of "[ilegível]" passages: suggest (public) → admin
 * queue → approve (text changes) or reject. Same flow as the gallery caption
 * suggestions. An approved reading is a human edit in the page history, but
 * doesn't mark the page verified — that stays a full-page check by the team
 * (verified pages are the gold set that scores the AI models).
 */

export type SuggestResult = { ok: true } | { ok: false; error: string };

export async function createSuggestion(input: {
  editionId: number;
  page: number;
  occurrence: number;
  /** The few words the visitor saw right before the marker — guards against a text that changed meanwhile. */
  seenBefore: string;
  reading: string;
  submitterName: string;
}): Promise<SuggestResult> {
  const valid = validateReading(input.reading);
  if ("error" in valid) return { ok: false, error: valid.error };

  const row = await prisma.editionPage.findFirst({
    where: { editionId: input.editionId, page: input.page, edition: { deletedAt: null } },
    select: { revisedText: true },
  });
  const marker = row?.revisedText ? findMarkers(row.revisedText)[input.occurrence] : undefined;
  if (!marker || !seenBeforeMatches(marker.before, input.seenBefore)) {
    return { ok: false, error: "Esse trecho mudou desde que a página foi aberta. Recarregue e tente de novo." };
  }

  const duplicate = await prisma.transcriptionSuggestion.findFirst({
    where: {
      editionId: input.editionId,
      page: input.page,
      occurrence: input.occurrence,
      suggestion: valid.reading,
      status: "pending",
    },
    select: { id: true },
  });
  if (!duplicate) {
    await prisma.transcriptionSuggestion.create({
      data: {
        editionId: input.editionId,
        page: input.page,
        occurrence: input.occurrence,
        contextBefore: marker.before,
        contextAfter: marker.after,
        suggestion: valid.reading,
        submitterName: squash(input.submitterName).slice(0, 100) || null,
      },
    });
  }
  return { ok: true };
}

export async function getPendingTranscriptionSuggestions() {
  const suggestions = await prisma.transcriptionSuggestion.findMany({
    where: { status: "pending", edition: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { edition: { select: { title: true, editionNumber: true, publishedAt: true } } },
  });
  // Tell the admin up front which ones can no longer be applied.
  const pages = await prisma.editionPage.findMany({
    where: { OR: suggestions.map((s) => ({ editionId: s.editionId, page: s.page })) },
    select: { editionId: true, page: true, revisedText: true },
  });
  const textOf = new Map(pages.map((p) => [`${p.editionId}-${p.page}`, p.revisedText ?? ""]));
  return suggestions.map((s) => ({
    ...s,
    applicable: locateMarker(textOf.get(`${s.editionId}-${s.page}`) ?? "", s) != null,
  }));
}

export function countPendingTranscriptionSuggestions() {
  return prisma.transcriptionSuggestion.count({ where: { status: "pending", edition: { deletedAt: null } } });
}

export async function approveSuggestion(id: number, reviewer: string): Promise<SuggestResult & { editionId?: number }> {
  const s = await prisma.transcriptionSuggestion.findUnique({ where: { id } });
  if (!s || s.status !== "pending") return { ok: false, error: "Sugestão não encontrada ou já revisada." };
  const where = { editionId_page: { editionId: s.editionId, page: s.page } };
  const page = await prisma.editionPage.findUnique({ where, select: { revisedText: true } });
  const marker = page?.revisedText ? locateMarker(page.revisedText, s) : null;
  if (!page?.revisedText || !marker) {
    return { ok: false, error: "O trecho não está mais na transcrição (o texto mudou). Rejeite ou corrija pela revisão da página." };
  }

  const text = applyReading(page.revisedText, marker, s.suggestion);
  const author = `${reviewer} (sugestão de ${s.submitterName ?? "visitante"})`.slice(0, 191);
  const now = new Date();
  await prisma.$transaction([
    prisma.editionPage.update({ where, data: { revisedText: text } }),
    prisma.pageTextVersion.create({ data: { editionId: s.editionId, page: s.page, text, source: "human", author } }),
    prisma.transcriptionSuggestion.update({
      where: { id },
      data: { status: "approved", reviewedBy: reviewer, reviewedAt: now },
    }),
  ]);
  // Same as a human edit: people/places are extracted again, search sees the
  // new text (the semantic vectors follow via edition_pages.updatedAt).
  await clearPageExtraction(s.editionId, [s.page]);
  await reindexFromDatabase([s.editionId]);
  return { ok: true, editionId: s.editionId };
}

export async function rejectSuggestion(id: number, reviewer: string) {
  await prisma.transcriptionSuggestion.updateMany({
    where: { id, status: "pending" },
    data: { status: "rejected", reviewedBy: reviewer, reviewedAt: new Date() },
  });
}
