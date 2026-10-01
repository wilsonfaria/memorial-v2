import { prisma } from "@/lib/prisma";
import { availableExtractModels, availableModels, isAiConfigured, msUntilQuotaReset } from "@/lib/ai-providers/registry";
import { reviseNextPage } from "@/lib/ocr-revision/revise";
import { extractNextPage } from "@/lib/entities/extract";
import { embedNextPages, embedPaceMs } from "@/lib/search/embed-pages";
import { isEmbeddingConfigured, isEmbeddingQuotaExhausted } from "@/lib/search/embeddings";

/**
 * Background AI work: first embeds changed pages for semantic search (one
 * batched request for several pages), then extracts people/places/articles
 * from pages that are already transcribed (1 cheap request each), then transcribes the next
 * pending page — every pending page, on its own,
 * inside the server process (started from src/instrumentation.ts), so the
 * archive keeps advancing with no browser open. Switched on/off and paced
 * from the admin (site_settings.aiWorkerEnabled / aiWorkerIntervalSec).
 *
 * Gentle on the free tier:
 *  - every Gemini request is throttled (see gemini.ts), plus a pause between pages;
 *  - when all models' daily quota is used up it sleeps until Google resets it
 *    (midnight Pacific) and carries on by itself;
 *  - a page that fails is marked and skipped; several failures in a row
 *    (network, Google down) back off for a while instead of hammering.
 */

export type WorkerPhase =
  | "off" // disabled in the admin
  | "no-key" // GEMINI_API_KEY missing
  | "working"
  | "pausing" // short pause between pages
  | "quota" // daily quota used up, waiting for the reset
  | "backoff" // several errors in a row, waiting before trying again
  | "done"; // nothing pending

export type WorkerState = {
  phase: WorkerPhase;
  /** Pages transcribed / extracted / embedded / failed since the server started. */
  revised: number;
  extracted: number;
  embedded: number;
  failed: number;
  last: { text: string; at: string; kind: "ok" | "err" | "info" } | null;
  /** ISO time the worker will resume (quota / backoff / done). */
  resumeAt: string | null;
};

type Shared = {
  started: boolean;
  wake: () => void;
  state: WorkerState;
  /** Embedding step sits out until then (per-minute limit, nothing pending) — the rest carries on. */
  embedPauseUntil?: number;
};

// On globalThis: the loop runs in the instrumentation bundle, the admin
// actions read it from the app bundle — both must see the same object.
const shared: Shared = ((globalThis as { __memorialAiWorker?: Shared }).__memorialAiWorker ??= {
  started: false,
  wake: () => {},
  state: { phase: "off", revised: 0, extracted: 0, embedded: 0, failed: 0, last: null, resumeAt: null },
});

export function getWorkerState(): WorkerState {
  return shared.state;
}

/** Interrupts the current wait so a change made in the admin applies right away. */
export function wakeWorker() {
  shared.wake();
}

const IDLE_CHECK_MS = 30_000; // how often a disabled/idle worker looks again
const DONE_RECHECK_MS = 10 * 60_000; // nothing pending: look for new uploads every 10 min
const BACKOFF_MS = 10 * 60_000;
const MAX_FAILS_IN_A_ROW = 3;
/** Google "high demand" (503): wait this long, then retry the same page. */
const BUSY_WAIT_MS = 5 * 60_000;

function set(patch: Partial<WorkerState>) {
  shared.state = { ...shared.state, ...patch };
}

function note(text: string, kind: "ok" | "err" | "info" = "info") {
  set({ last: { text, at: new Date().toISOString(), kind } });
  console.log(`[ia-auto] ${text}`);
}

/** Sleeps up to `ms`, returning early when the admin changes something. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      shared.wake = () => {};
      resolve();
    }
    shared.wake = done;
  });
}

async function readSettings() {
  const s = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { aiWorkerEnabled: true, aiWorkerIntervalSec: true },
  });
  return { enabled: s?.aiWorkerEnabled ?? false, intervalSec: Math.max(0, s?.aiWorkerIntervalSec ?? 20) };
}

async function editionName(editionId: number) {
  const e = await prisma.edition.findUnique({ where: { id: editionId }, select: { title: true, editionNumber: true } });
  return e?.editionNumber != null ? `Edição nº ${e.editionNumber}` : (e?.title ?? `Edição ${editionId}`);
}

/** Waits `ms`, but no longer than until the embedding step is due again (when it has work). */
function waitOrEmbed(ms: number, embedding: boolean): Promise<void> {
  const untilEmbed = (shared.embedPauseUntil ?? 0) - Date.now();
  return wait(embedding ? Math.max(1000, Math.min(ms, untilEmbed)) : ms);
}

async function loop() {
  let failsInARow = 0;
  let embedding = false;
  for (;;) {
    try {
      const { enabled, intervalSec } = await readSettings();
      if (!enabled) {
        set({ phase: "off", resumeAt: null });
        failsInARow = 0;
        await wait(IDLE_CHECK_MS);
        continue;
      }

      // 0) Semantic-search vectors. Own key (always Gemini) and own quota, so
      // it runs before the checks below and never holds up the other steps.
      if (isEmbeddingConfigured() && !isEmbeddingQuotaExhausted() && Date.now() >= (shared.embedPauseUntil ?? 0)) {
        set({ phase: "working", resumeAt: null });
        const em = await embedNextPages();
        if (em.status === "embedded" || em.status === "failed") {
          if (em.status === "embedded") {
            set({ embedded: (shared.state.embedded ?? 0) + em.pages });
            note(`Busca semântica: ${em.pages} páginas (${em.passages} trechos) · faltam ${em.remaining}`, "ok");
            // Per-minute budget counts texts, not calls: the other steps run meanwhile.
            shared.embedPauseUntil = Date.now() + embedPaceMs(em.passages);
          } else {
            set({ failed: shared.state.failed + 1 });
            note(`Busca semântica: ${em.pages} páginas falharam: ${em.error.slice(0, 160)}`, "err");
          }
        }
        if (em.status === "busy") {
          shared.embedPauseUntil = Date.now() + em.retryAfterMs;
        } else if (em.status === "done") {
          shared.embedPauseUntil = Date.now() + DONE_RECHECK_MS;
        } else if (em.status === "quota") {
          note("Cota diária de embeddings esgotada. A busca semântica continua depois que o Google renovar.", "info");
        }
        embedding = em.status === "embedded" || em.status === "failed" || em.status === "busy";
      }

      if (!isAiConfigured()) {
        set({ phase: "no-key", resumeAt: null });
        await waitOrEmbed(IDLE_CHECK_MS, embedding);
        continue;
      }
      if (availableModels().length === 0) {
        const ms = msUntilQuotaReset() + 5 * 60_000; // a little after the reset
        set({ phase: "quota", resumeAt: new Date(Date.now() + ms).toISOString() });
        await waitOrEmbed(ms, embedding);
        continue;
      }

      set({ phase: "working", resumeAt: null });

      // 1) Structured extraction of already-transcribed pages (keeps up with the transcription).
      if (availableExtractModels().length > 0) {
        const ex = await extractNextPage();
        if (ex.status === "extracted" || ex.status === "failed") {
          const name = await editionName(ex.editionId);
          if (ex.status === "extracted") {
            failsInARow = 0;
            set({ extracted: (shared.state.extracted ?? 0) + 1 });
            note(`${name} · pág. ${ex.page}: ${ex.result.articles} matérias, ${ex.result.people} pessoas, ${ex.result.places} lugares extraídos`, "ok");
          } else {
            failsInARow++;
            set({ failed: shared.state.failed + 1 });
            note(`${name} · pág. ${ex.page}: extração falhou: ${ex.error.slice(0, 160)}`, "err");
          }
          if (intervalSec > 0) {
            set({ phase: "pausing", resumeAt: new Date(Date.now() + intervalSec * 1000).toISOString() });
            await wait(intervalSec * 1000);
          }
          continue;
        }
        if (ex.status === "busy") {
          note("Google sobrecarregado (extração) — aguardando 5 min, sem marcar a página.", "info");
          set({ phase: "backoff", resumeAt: new Date(Date.now() + BUSY_WAIT_MS).toISOString() });
          await wait(BUSY_WAIT_MS);
          continue;
        }
        // "done" or "quota": nothing to extract right now — go on to transcription.
      }

      // 2) Transcription of the next pending page.
      const r = await reviseNextPage();

      if (r.status === "done") {
        if (!embedding) note("Nenhuma página pendente. Tudo transcrito.");
        set({ phase: "done", resumeAt: new Date(Date.now() + DONE_RECHECK_MS).toISOString() });
        await waitOrEmbed(DONE_RECHECK_MS, embedding);
        continue;
      }
      if (r.status === "busy") {
        note("Google sobrecarregado (transcrição) — aguardando 5 min, sem marcar a página.", "info");
        set({ phase: "backoff", resumeAt: new Date(Date.now() + BUSY_WAIT_MS).toISOString() });
        await wait(BUSY_WAIT_MS);
        continue;
      }
      if (r.status === "quota") {
        note("Cota gratuita do dia esgotada em todos os modelos. Continua depois que o Google renovar.", "info");
        continue; // next turn sees availableModels() empty and sleeps until the reset
      }
      if (r.status === "revised") {
        failsInARow = 0;
        set({ revised: shared.state.revised + 1 });
        note(`${await editionName(r.result.editionId)} · pág. ${r.result.page} transcrita (${r.result.chars} caracteres) · faltam ${r.remaining}`, "ok");
      } else {
        failsInARow++;
        set({ failed: shared.state.failed + 1 });
        note(`${await editionName(r.editionId)} · pág. ${r.page} falhou: ${r.error.slice(0, 160)}`, "err");
        if (failsInARow >= MAX_FAILS_IN_A_ROW) {
          failsInARow = 0;
          note(`${MAX_FAILS_IN_A_ROW} falhas seguidas: aguardando ${BACKOFF_MS / 60_000} min antes de continuar.`, "err");
          set({ phase: "backoff", resumeAt: new Date(Date.now() + BACKOFF_MS).toISOString() });
          await wait(BACKOFF_MS);
          continue;
        }
      }

      if (intervalSec > 0) {
        set({ phase: "pausing", resumeAt: new Date(Date.now() + intervalSec * 1000).toISOString() });
        await wait(intervalSec * 1000);
      }
    } catch (err) {
      // DB hiccup or similar: never let the loop die.
      note(`Erro inesperado: ${(err as Error).message.slice(0, 200)}`, "err");
      set({ phase: "backoff", resumeAt: new Date(Date.now() + 60_000).toISOString() });
      await wait(60_000);
    }
  }
}

/** Starts the loop once per process (it idles while disabled in the admin). */
export function startAiWorker() {
  if (shared.started || process.env.AI_WORKER === "off") return;
  shared.started = true;
  void loop();
}
