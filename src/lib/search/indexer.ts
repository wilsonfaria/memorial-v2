import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";
import { extractEditionPages, type ExtractionResult } from "@/lib/ocr";
import {
  deleteAllDocuments,
  deleteEditionDocuments,
  isMeiliConfigured,
  upsertDocuments,
  waitForTask,
  type MeiliPageDoc,
} from "@/lib/search/meili";

/**
 * Keeps edition_pages (source of truth) and the Meilisearch index in sync
 * with the editions and their PDFs. MariaDB is always written; Meilisearch
 * only when configured — and a Meilisearch failure never undoes the MariaDB
 * write (the admin "Indexar busca" can resend everything later).
 */

const editionInclude = { month: { include: { year: { include: { decade: true } } } } } as const;

type EditionForDocs = {
  id: number;
  title: string;
  editionNumber: number | null;
  publishedAt: Date;
  deletedAt: Date | null;
  month: { month: number; year: { year: number; decade: { startYear: number } } };
};

function toDocs(edition: EditionForDocs, pages: { page: number; text: string }[]): MeiliPageDoc[] {
  const date = edition.publishedAt.toISOString().slice(0, 10);
  return pages.map((p) => ({
    id: `${edition.id}-${p.page}`,
    editionId: edition.id,
    page: p.page,
    text: p.text,
    title: edition.title,
    editionNumber: edition.editionNumber,
    date,
    timestamp: Math.floor(edition.publishedAt.getTime() / 1000),
    decade: edition.month.year.decade.startYear,
    year: edition.month.year.year,
    month: edition.month.month,
    day: edition.publishedAt.getUTCDate(),
  }));
}

/** Replaces the edition's documents in Meilisearch with what's in edition_pages. */
async function pushToMeili(editions: EditionForDocs[], wait = false) {
  if (!isMeiliConfigured() || editions.length === 0) return;
  const ids = editions.map((e) => e.id);
  const pages = await prisma.editionPage.findMany({
    where: { editionId: { in: ids } },
    select: { editionId: true, page: true, text: true },
  });
  const byEdition = new Map<number, { page: number; text: string }[]>();
  for (const p of pages) byEdition.set(p.editionId, [...(byEdition.get(p.editionId) ?? []), p]);

  const deleteTask = await deleteEditionDocuments(ids);
  const docs = editions.filter((e) => !e.deletedAt).flatMap((e) => toDocs(e, byEdition.get(e.id) ?? []));
  const addTask = await upsertDocuments(docs);
  if (wait) {
    if (deleteTask != null) await waitForTask(deleteTask);
    if (addTask != null) await waitForTask(addTask, 120000);
  }
}

export type IndexEditionResult = Pick<ExtractionResult, "pagesTotal" | "ocrPages" | "pagesWithoutText"> & {
  pagesWithText: number;
  meili: "ok" | "off" | "error";
};

/**
 * Extracts the text of every page of an edition's PDF, stores it in
 * edition_pages and pushes it to Meilisearch. Pass the PDF bytes when you
 * already have them (upload); otherwise it's read from storage.
 */
export async function indexEdition(
  editionId: number,
  { pdfBytes, ocr = false }: { pdfBytes?: Buffer; ocr?: boolean } = {}
): Promise<IndexEditionResult> {
  const edition = await prisma.edition.findUniqueOrThrow({ where: { id: editionId }, include: editionInclude });
  const bytes = pdfBytes ?? (await readFile(absolutePdfPath(edition.pdfPath)));
  const result = await extractEditionPages(bytes, { ocr });

  await prisma.$transaction([
    prisma.editionPage.deleteMany({ where: { editionId } }),
    prisma.editionPage.createMany({
      data: result.pages.map((p) => ({ editionId, page: p.page, text: p.text, ocr: p.ocr })),
    }),
    prisma.edition.update({ where: { id: editionId }, data: { pageCount: result.pagesTotal } }),
  ]);

  let meili: IndexEditionResult["meili"] = "off";
  if (isMeiliConfigured()) {
    try {
      await pushToMeili([edition]);
      meili = "ok";
    } catch (err) {
      console.error(`Meilisearch: falha ao indexar a edição ${editionId}:`, err);
      meili = "error";
    }
  }

  return {
    pagesTotal: result.pagesTotal,
    ocrPages: result.ocrPages,
    pagesWithoutText: result.pagesWithoutText,
    pagesWithText: result.pages.length,
    meili,
  };
}

/**
 * For upload flows: indexes the new edition but never throws — a search
 * indexing problem must not fail an upload whose PDF is already saved.
 */
export async function indexEditionSafely(editionId: number, pdfBytes: Buffer): Promise<void> {
  try {
    await indexEdition(editionId, { pdfBytes });
  } catch (err) {
    console.error(`Falha ao indexar o texto da edição ${editionId}:`, err);
  }
}

/** Removes editions from Meilisearch (trash). Their edition_pages rows stay, so a restore is instant. */
export async function unindexEditions(editionIds: number[]): Promise<void> {
  if (!isMeiliConfigured() || editionIds.length === 0) return;
  try {
    await deleteEditionDocuments(editionIds);
  } catch (err) {
    console.error("Meilisearch: falha ao remover edições do índice:", err);
  }
}

/** Re-sends existing edition_pages rows to Meilisearch (trash restore). No PDF re-extraction. */
export async function reindexFromDatabase(editionIds: number[]): Promise<void> {
  if (!isMeiliConfigured() || editionIds.length === 0) return;
  try {
    const editions = await prisma.edition.findMany({ where: { id: { in: editionIds } }, include: editionInclude });
    await pushToMeili(editions);
  } catch (err) {
    console.error("Meilisearch: falha ao reindexar edições:", err);
  }
}

/**
 * Admin "Indexar busca" modes:
 *  - missing: extract text for editions that have no pages yet
 *  - all:     re-extract every edition from its PDF
 *  - sync:    resend what's already in edition_pages to Meilisearch (no PDF reading)
 */
export type ReindexMode = "missing" | "all" | "sync";

export type ReindexBatchResult = {
  processed: number;
  failed: { id: number; error: string }[];
  nextCursor: number | null;
  total: number;
  remaining: number;
};

function modeWhere(mode: ReindexMode) {
  return mode === "missing" ? { deletedAt: null, pages: { none: {} } } : { deletedAt: null };
}

/**
 * Processes one batch of editions with id > cursor. Callers loop until
 * nextCursor is null — small batches keep each request short, so a proxy
 * timeout can't kill a long reindex halfway.
 */
export async function reindexBatch(mode: ReindexMode, cursor: number, batchSize: number): Promise<ReindexBatchResult> {
  const where = modeWhere(mode);
  // "missing" shrinks as it goes, so its total is only meaningful on the first batch.
  const [total, remainingBefore] = await Promise.all([
    prisma.edition.count({ where: modeWhere(mode === "missing" ? "all" : mode) }),
    prisma.edition.count({ where: { ...where, id: { gt: cursor } } }),
  ]);

  if (mode === "sync" && cursor === 0 && isMeiliConfigured()) {
    await waitForTask(await deleteAllDocuments(), 120000);
  }

  const batch = await prisma.edition.findMany({
    where: { ...where, id: { gt: cursor } },
    include: editionInclude,
    orderBy: { id: "asc" },
    take: batchSize,
  });

  const failed: ReindexBatchResult["failed"] = [];
  if (mode === "sync") {
    await pushToMeili(batch, true);
  } else {
    for (const edition of batch) {
      try {
        const r = await indexEdition(edition.id);
        if (r.meili === "error") failed.push({ id: edition.id, error: "texto salvo, mas o Meilisearch recusou" });
      } catch (err) {
        failed.push({ id: edition.id, error: (err as Error).message });
      }
    }
  }

  const last = batch.at(-1)?.id ?? null;
  const remaining = Math.max(0, remainingBefore - batch.length);
  return {
    processed: batch.length,
    failed,
    nextCursor: remaining > 0 && last != null ? last : null,
    total,
    remaining,
  };
}
