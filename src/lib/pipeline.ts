import { prisma } from "@/lib/prisma";
import { indexEdition, reindexFromDatabase } from "@/lib/search/indexer";
import { isMeiliConfigured, meiliFetch, MEILI_INDEX } from "@/lib/search/meili";
import { revisePage } from "@/lib/ocr-revision/revise";
import { clearPageExtraction } from "@/lib/entities/extract";
import { DailyQuotaError, ModelBusyError, isAiConfigured, noRealError } from "@/lib/ai-providers/registry";

/**
 * Per-edition processing pipeline, driven one short step at a time from the
 * admin edition list (so a free-tier API can stop us mid-way without losing
 * work, and the operator picks exactly which editions run):
 *
 *   PDF → text (from the PDF's text layer) → AI (Gemini reads the page image)
 *       → search (Meilisearch)
 */

export type EditionPipelineStatus = {
  pages: number; // pages with extracted text (edition_pages rows)
  pageCount: number | null; // pages in the PDF
  revised: number; // pages with an AI transcription
  revisionErrors: number; // pages whose last AI attempt failed
  inSearch: number | null; // Meilisearch docs for the edition (null = Meilisearch off/unreachable)
};

/** Search-index doc counts per edition, in one Meilisearch facet query. */
async function meiliCounts(editionIds: number[]): Promise<Map<number, number> | null> {
  if (!isMeiliConfigured() || editionIds.length === 0) return null;
  try {
    const res = await meiliFetch<{ facetDistribution?: { editionId?: Record<string, number> } }>(
      `/indexes/${MEILI_INDEX}/search`,
      {
        method: "POST",
        timeoutMs: 3000,
        body: JSON.stringify({
          q: "",
          filter: `editionId IN [${editionIds.join(", ")}]`,
          facets: ["editionId"],
          limit: 0, // only the facet counts (they count every page, distinctAttribute notwithstanding)
        }),
      }
    );
    return new Map(Object.entries(res.facetDistribution?.editionId ?? {}).map(([id, n]) => [Number(id), n]));
  } catch {
    return null;
  }
}

export async function getPipelineStatuses(editionIds: number[]): Promise<Record<number, EditionPipelineStatus>> {
  if (editionIds.length === 0) return {};
  const [editions, pageGroups, revisedGroups, errorGroups, inSearch] = await Promise.all([
    prisma.edition.findMany({ where: { id: { in: editionIds } }, select: { id: true, pageCount: true } }),
    prisma.editionPage.groupBy({ by: ["editionId"], where: { editionId: { in: editionIds } }, _count: true }),
    prisma.editionPage.groupBy({
      by: ["editionId"],
      where: { editionId: { in: editionIds }, revisedAt: { not: null } },
      _count: true,
    }),
    prisma.editionPage.groupBy({
      by: ["editionId"],
      where: { editionId: { in: editionIds }, revisedAt: null, revisionError: { not: null } },
      _count: true,
    }),
    meiliCounts(editionIds),
  ]);
  const count = (groups: { editionId: number; _count: number }[]) => new Map(groups.map((g) => [g.editionId, g._count]));
  const pages = count(pageGroups);
  const revised = count(revisedGroups);
  const errors = count(errorGroups);

  return Object.fromEntries(
    editions.map((e) => [
      e.id,
      {
        pages: pages.get(e.id) ?? 0,
        pageCount: e.pageCount,
        revised: revised.get(e.id) ?? 0,
        revisionErrors: errors.get(e.id) ?? 0,
        inSearch: inSearch ? (inSearch.get(e.id) ?? 0) : null,
      },
    ])
  );
}

export type PipelineStage = "extract" | "revise" | "index";

export type StepResult =
  | { ok: true; stage: PipelineStage; detail: string; done: boolean }
  | { ok: false; stage: PipelineStage; detail: string; quota?: boolean };

/**
 * Runs ONE step of one stage for one edition:
 *  - extract: re-read the text of every page from the PDF (keeps AI transcriptions)
 *  - revise:  AI-transcribe the next pending page (call again until done)
 *  - index:   push the edition's current text to Meilisearch
 */
export async function runPipelineStep(editionId: number, stage: PipelineStage): Promise<StepResult> {
  try {
    if (stage === "extract") {
      const r = await indexEdition(editionId);
      return {
        ok: true,
        stage,
        done: true,
        detail: `texto de ${r.pagesWithText}/${r.pagesTotal} página(s)${r.pagesWithoutText ? `, ${r.pagesWithoutText} sem texto embutido` : ""}`,
      };
    }

    if (stage === "index") {
      if (!isMeiliConfigured()) return { ok: false, stage, detail: "Meilisearch não configurado" };
      await reindexFromDatabase([editionId]);
      return { ok: true, stage, done: true, detail: "enviada à busca" };
    }

    if (!isAiConfigured()) return { ok: false, stage, detail: "nenhuma chave de API de IA configurada" };
    const pending = { editionId, revisedAt: null, ...noRealError("revisionError") };
    const next = await prisma.editionPage.findFirst({
      where: pending,
      orderBy: { page: "asc" },
      select: { page: true },
    });
    if (!next) return { ok: true, stage, done: true, detail: "todas as páginas já revisadas" };
    try {
      const r = await revisePage(editionId, next.page);
      const left = await prisma.editionPage.count({ where: pending });
      return { ok: true, stage, done: left === 0, detail: `pág. ${r.page} revisada (${r.chars} caracteres)` };
    } catch (err) {
      if (err instanceof DailyQuotaError) return { ok: false, stage, detail: err.message, quota: true };
      // Overloaded: stop this edition without marking the page; run it again later.
      if (err instanceof ModelBusyError) return { ok: false, stage, detail: err.message };
      const message = (err as Error).message.slice(0, 1000);
      await prisma.editionPage.update({
        where: { editionId_page: { editionId, page: next.page } },
        data: { revisionError: message },
      });
      const left = await prisma.editionPage.count({ where: pending });
      // A failed page is marked and skipped; the edition goes on with the rest.
      return { ok: true, stage, done: left === 0, detail: `pág. ${next.page} falhou: ${message.slice(0, 160)}` };
    }
  } catch (err) {
    return { ok: false, stage, detail: (err as Error).message.slice(0, 300) };
  }
}

/**
 * Clears an edition's AI transcriptions (and errors) so "revise" redoes every
 * page. Pages a person verified are left alone — their text is the reference.
 */
export async function resetRevision(editionId: number, onlyFailed = false): Promise<number> {
  if (!onlyFailed) {
    const pages = await prisma.editionPage.findMany({ where: { editionId, verifiedAt: null }, select: { page: true } });
    await clearPageExtraction(editionId, pages.map((p) => p.page));
  }
  const r = await prisma.editionPage.updateMany({
    where: { editionId, verifiedAt: null, ...(onlyFailed ? { revisionError: { not: null } } : {}) },
    data: onlyFailed
      ? { revisionError: null }
      : { revisedText: null, revisedModel: null, revisedAt: null, revisionError: null },
  });
  if (!onlyFailed) await reindexFromDatabase([editionId]); // search falls back to the original text
  return r.count;
}

export type PickCriterion = "no-text" | "ai-pending" | "ai-errors";

/** Ids of editions needing a stage — next ones in date order, or a random sample. */
export async function pickEditions(criterion: PickCriterion, count: number, order: "sequential" | "random") {
  const where =
    criterion === "no-text"
      ? { deletedAt: null, pages: { none: {} } }
      : criterion === "ai-errors"
        ? { deletedAt: null, pages: { some: { revisedAt: null, revisionError: { not: null } } } }
        : { deletedAt: null, pages: { some: { revisedAt: null, revisionError: null } } };
  const n = Math.max(1, Math.min(count, 50));
  if (order === "sequential") {
    const rows = await prisma.edition.findMany({ where, orderBy: { publishedAt: "asc" }, take: n, select: { id: true } });
    return rows.map((r) => r.id);
  }
  const all = await prisma.edition.findMany({ where, select: { id: true } });
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n).map((r) => r.id);
}

export async function getPipelineTotals() {
  const live = { edition: { deletedAt: null } };
  const [editions, noText, pages, revised, errors, fullyRevised] = await Promise.all([
    prisma.edition.count({ where: { deletedAt: null } }),
    prisma.edition.count({ where: { deletedAt: null, pages: { none: {} } } }),
    prisma.editionPage.count({ where: live }),
    prisma.editionPage.count({ where: { ...live, revisedAt: { not: null } } }),
    prisma.editionPage.count({ where: { ...live, revisedAt: null, revisionError: { not: null } } }),
    prisma.edition.count({
      where: { deletedAt: null, pages: { some: {}, every: { revisedAt: { not: null } } } },
    }),
  ]);
  return { editions, noText, pages, revised, errors, fullyRevised, aiConfigured: isAiConfigured() };
}
