import { prisma } from "@/lib/prisma";
import { reindexFromDatabase } from "@/lib/search/indexer";
import { scoreTranscription } from "@/lib/ocr-revision/quality";
import { clearPageExtraction } from "@/lib/entities/extract";

/**
 * Human review of AI transcriptions: edit, verify, browse history, restore.
 * Every text a page gets is kept in page_text_versions; verified pages become
 * the gold set that measures each model (see getModelQuality).
 */

const where = (editionId: number, page: number) => ({ editionId_page: { editionId, page } });

/** Saves a person's corrected text and marks the page as verified by them. */
export async function saveHumanEdit(editionId: number, page: number, text: string, author: string) {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) throw new Error("O texto não pode ficar vazio.");
  const current = await prisma.editionPage.findUniqueOrThrow({
    where: where(editionId, page),
    select: { revisedText: true, revisedModel: true, revisedAt: true },
  });
  const changed = clean !== (current.revisedText ?? "").trim();
  const now = new Date();

  await prisma.$transaction([
    prisma.editionPage.update({
      where: where(editionId, page),
      data: {
        revisedText: clean,
        // A page the AI never did is a fully human transcription.
        revisedModel: current.revisedModel ?? "humano",
        revisedAt: current.revisedAt ?? now,
        revisionError: null,
        verifiedAt: now,
        verifiedBy: author,
      },
    }),
    ...(changed
      ? [prisma.pageTextVersion.create({ data: { editionId, page, text: clean, source: "human", author } })]
      : []),
  ]);
  if (changed) {
    await clearPageExtraction(editionId, [page]); // corrected text → extract again
    await reindexFromDatabase([editionId]);
  }
  return { changed };
}

/** Marks the current AI text as correct as-is (counts as a perfect score for its model). */
export async function verifyPage(editionId: number, page: number, author: string) {
  const p = await prisma.editionPage.findUniqueOrThrow({ where: where(editionId, page), select: { revisedText: true } });
  if (!p.revisedText) throw new Error("Esta página ainda não tem transcrição para conferir.");
  await prisma.editionPage.update({ where: where(editionId, page), data: { verifiedAt: new Date(), verifiedBy: author } });
}

export async function unverifyPage(editionId: number, page: number) {
  await prisma.editionPage.update({ where: where(editionId, page), data: { verifiedAt: null, verifiedBy: null } });
}

export async function listVersions(editionId: number, page: number) {
  return prisma.pageTextVersion.findMany({
    where: { editionId, page },
    orderBy: { createdAt: "desc" },
    select: { id: true, source: true, model: true, author: true, createdAt: true, text: true },
  });
}

/** Brings an older version back as the current text (recorded as a new human edit). */
export async function restoreVersion(versionId: number, author: string) {
  const v = await prisma.pageTextVersion.findUniqueOrThrow({ where: { id: versionId } });
  await saveHumanEdit(v.editionId, v.page, v.text, author);
  return { editionId: v.editionId, page: v.page };
}

export type ModelQuality = {
  model: string;
  pages: number;
  /** Averages weighted by reference length (long pages count more). */
  cer: number;
  wer: number;
  perfect: number;
};

export type GoldPage = {
  editionId: number;
  editionName: string;
  page: number;
  model: string;
  cer: number;
  wer: number;
  verifiedBy: string | null;
  verifiedAt: Date;
};

/**
 * Error rate of each AI model on the verified pages: its first transcription
 * of the page vs. the text a person verified. Needs no extra API calls.
 */
export async function getModelQuality(): Promise<{ models: ModelQuality[]; pages: GoldPage[] }> {
  const verified = await prisma.editionPage.findMany({
    where: { verifiedAt: { not: null }, revisedText: { not: null }, edition: { deletedAt: null } },
    select: {
      editionId: true,
      page: true,
      revisedText: true,
      verifiedAt: true,
      verifiedBy: true,
      edition: { select: { title: true, editionNumber: true } },
    },
    orderBy: [{ verifiedAt: "desc" }],
  });
  if (verified.length === 0) return { models: [], pages: [] };

  const firstAi = await prisma.pageTextVersion.findMany({
    where: { source: "ai", OR: verified.map((v) => ({ editionId: v.editionId, page: v.page })) },
    orderBy: { createdAt: "asc" },
    select: { editionId: true, page: true, text: true, model: true },
  });
  const byPage = new Map<string, (typeof firstAi)[number]>();
  for (const v of firstAi) {
    const key = `${v.editionId}-${v.page}`;
    if (!byPage.has(key)) byPage.set(key, v);
  }

  const pages: GoldPage[] = [];
  const agg = new Map<string, { chars: number; words: number; charErr: number; wordErr: number; pages: number; perfect: number }>();
  for (const v of verified) {
    const ai = byPage.get(`${v.editionId}-${v.page}`);
    if (!ai) continue; // transcribed by a person from scratch: nothing to score
    const s = scoreTranscription(v.revisedText!, ai.text);
    const model = ai.model ?? "?";
    pages.push({
      editionId: v.editionId,
      editionName: v.edition.editionNumber != null ? `Edição nº ${v.edition.editionNumber}` : v.edition.title,
      page: v.page,
      model,
      cer: s.cer,
      wer: s.wer,
      verifiedBy: v.verifiedBy,
      verifiedAt: v.verifiedAt!,
    });
    const a = agg.get(model) ?? { chars: 0, words: 0, charErr: 0, wordErr: 0, pages: 0, perfect: 0 };
    a.chars += s.refChars;
    a.words += s.refWords;
    a.charErr += s.cer * s.refChars;
    a.wordErr += s.wer * s.refWords;
    a.pages++;
    if (s.cer === 0) a.perfect++;
    agg.set(model, a);
  }

  const models = [...agg.entries()]
    .map(([model, a]) => ({
      model,
      pages: a.pages,
      cer: a.chars ? a.charErr / a.chars : 0,
      wer: a.words ? a.wordErr / a.words : 0,
      perfect: a.perfect,
    }))
    .sort((x, y) => x.cer - y.cer);
  return { models, pages };
}
