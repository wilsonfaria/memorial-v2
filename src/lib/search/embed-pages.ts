import { prisma } from "@/lib/prisma";
import { DailyQuotaError, ModelBusyError } from "@/lib/ai-providers/types";
import { EMBED_MODEL, EmbedRateLimitError, MAX_BATCH, embedTexts } from "@/lib/search/embeddings";
import { packVectors, pageSearchText, splitPassages, textHash, type Passage } from "@/lib/search/passages";
import { reindexFromDatabase } from "@/lib/search/indexer";

/**
 * Keeps page_embeddings in step with edition_pages: a page is pending when it
 * has no vectors yet, when its row changed after it was embedded (updatedAt —
 * a new transcription, a human correction, a re-extracted PDF) or when the
 * embedding model changed. An unchanged text (same hash) is only re-stamped,
 * never re-sent to the API. Driven by the background AI worker.
 */

const PENDING_SQL_LIMIT = 50;
/**
 * The free tier counts every text in a batch as one request, 100 per minute
 * per model (checked 2026-09-30: EmbedContentRequestsPerMinute…, quotaValue
 * 100). Search queries share that budget, so indexing keeps some headroom.
 */
const PASSAGES_PER_MINUTE = Number(process.env.GEMINI_EMBED_PER_MINUTE) || 80;
const BATCH_PASSAGES = Math.min(MAX_BATCH, PASSAGES_PER_MINUTE);

/** How long to wait after sending `passages` texts to stay under PASSAGES_PER_MINUTE. */
export function embedPaceMs(passages: number): number {
  return Math.ceil((passages * 60_000) / PASSAGES_PER_MINUTE);
}

type PendingPage = { editionId: number; page: number };

async function pendingPages(limit: number): Promise<PendingPage[]> {
  return prisma.$queryRaw<PendingPage[]>`
    SELECT p.editionId, p.page
    FROM edition_pages p
    JOIN editions e ON e.id = p.editionId AND e.deletedAt IS NULL
    LEFT JOIN page_embeddings pe ON pe.editionId = p.editionId AND pe.page = p.page
    WHERE pe.editionId IS NULL OR pe.embeddedAt < p.updatedAt OR pe.model <> ${EMBED_MODEL}
    ORDER BY p.editionId, p.page
    LIMIT ${limit}`;
}

export async function countPendingEmbeddings(): Promise<{ pending: number; embedded: number }> {
  const [row] = await prisma.$queryRaw<{ pending: bigint; embedded: bigint }[]>`
    SELECT
      SUM(pe.editionId IS NULL OR pe.embeddedAt < p.updatedAt OR pe.model <> ${EMBED_MODEL}) AS pending,
      SUM(pe.editionId IS NOT NULL AND pe.embeddedAt >= p.updatedAt AND pe.model = ${EMBED_MODEL} AND pe.error IS NULL) AS embedded
    FROM edition_pages p
    JOIN editions e ON e.id = p.editionId AND e.deletedAt IS NULL
    LEFT JOIN page_embeddings pe ON pe.editionId = p.editionId AND pe.page = p.page`;
  return { pending: Number(row?.pending ?? 0), embedded: Number(row?.embedded ?? 0) };
}

export type EmbedNextResult =
  | { status: "embedded"; pages: number; passages: number; remaining: number }
  | { status: "failed"; pages: number; error: string; remaining: number }
  | { status: "done" }
  | { status: "quota" }
  | { status: "busy"; retryAfterMs: number };

type Job = { editionId: number; page: number; hash: string; text: string; passages: Passage[] };

/**
 * Embeds the next pending pages — as many as fit in one API request
 * (MAX_BATCH passages) — then resends their editions to Meilisearch.
 */
export async function embedNextPages(): Promise<EmbedNextResult> {
  const pending = await pendingPages(PENDING_SQL_LIMIT);
  if (pending.length === 0) return { status: "done" };

  const rows = await prisma.editionPage.findMany({
    where: { OR: pending.map((p) => ({ editionId: p.editionId, page: p.page })) },
    select: { editionId: true, page: true, text: true, revisedText: true },
  });
  const existing = new Map(
    (
      await prisma.pageEmbedding.findMany({
        where: { OR: pending.map((p) => ({ editionId: p.editionId, page: p.page })) },
        select: { editionId: true, page: true, textHash: true, model: true },
      })
    ).map((e) => [`${e.editionId}-${e.page}`, e])
  );

  const now = new Date();
  const jobs: Job[] = [];
  let batchPassages = 0;
  for (const row of rows.sort((a, b) => a.editionId - b.editionId || a.page - b.page)) {
    const text = pageSearchText(row);
    const hash = textHash(text);
    const prev = existing.get(`${row.editionId}-${row.page}`);
    const where = { editionId_page: { editionId: row.editionId, page: row.page } };
    if (prev && prev.textHash === hash && prev.model === EMBED_MODEL) {
      await prisma.pageEmbedding.update({ where, data: { embeddedAt: now } });
      continue;
    }
    const passages = splitPassages(text).slice(0, MAX_BATCH);
    if (passages.length === 0) {
      await saveEmbedding({ editionId: row.editionId, page: row.page, hash, text, passages }, [], now);
      continue;
    }
    if (jobs.length > 0 && batchPassages + passages.length > BATCH_PASSAGES) break;
    jobs.push({ editionId: row.editionId, page: row.page, hash, text, passages });
    batchPassages += passages.length;
  }

  if (jobs.length === 0) return embedNextPages(); // only re-stamps this round: look further
  const inputs = jobs.flatMap((j) => j.passages.map(([a, b]) => j.text.slice(a, b)));

  let vectors: number[][];
  try {
    vectors = await embedTexts(inputs, "RETRIEVAL_DOCUMENT");
  } catch (err) {
    if (err instanceof DailyQuotaError) return { status: "quota" };
    if (err instanceof EmbedRateLimitError) return { status: "busy", retryAfterMs: err.retryAfterMs };
    if (err instanceof ModelBusyError) return { status: "busy", retryAfterMs: 5 * 60_000 };
    // A rejected input: mark the pages so the queue moves on; a new text retries them.
    const message = (err as Error).message.slice(0, 1000);
    for (const j of jobs) await saveEmbedding(j, [], now, message);
    return { status: "failed", pages: jobs.length, error: message, remaining: (await countPendingEmbeddings()).pending };
  }

  let offset = 0;
  for (const j of jobs) {
    await saveEmbedding(j, vectors.slice(offset, offset + j.passages.length), now);
    offset += j.passages.length;
  }
  await reindexFromDatabase([...new Set(jobs.map((j) => j.editionId))]);

  return {
    status: "embedded",
    pages: jobs.length,
    passages: inputs.length,
    remaining: (await countPendingEmbeddings()).pending,
  };
}

async function saveEmbedding(job: Job, vectors: number[][], at: Date, error: string | null = null) {
  const data = {
    textHash: job.hash,
    model: EMBED_MODEL,
    chunks: error ? [] : job.passages,
    vectors: new Uint8Array(packVectors(vectors)),
    error,
    embeddedAt: at,
  };
  await prisma.pageEmbedding.upsert({
    where: { editionId_page: { editionId: job.editionId, page: job.page } },
    create: { editionId: job.editionId, page: job.page, ...data },
    update: data,
  });
}
