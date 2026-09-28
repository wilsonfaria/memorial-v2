import { prisma } from "@/lib/prisma";
import { availableModels, isGeminiConfigured, msUntilQuotaReset } from "@/lib/ocr-revision/gemini";
import { reviseNextPage } from "@/lib/ocr-revision/revise";

/**
 * Background AI transcription: works through every pending page on its own,
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
  /** Pages transcribed / failed since the server started. */
  revised: number;
  failed: number;
  last: { text: string; at: string; kind: "ok" | "err" | "info" } | null;
  /** ISO time the worker will resume (quota / backoff / done). */
  resumeAt: string | null;
};

type Shared = { started: boolean; wake: () => void; state: WorkerState };

// On globalThis: the loop runs in the instrumentation bundle, the admin
// actions read it from the app bundle — both must see the same object.
const shared: Shared = ((globalThis as { __memorialAiWorker?: Shared }).__memorialAiWorker ??= {
  started: false,
  wake: () => {},
  state: { phase: "off", revised: 0, failed: 0, last: null, resumeAt: null },
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

async function loop() {
  let failsInARow = 0;
  for (;;) {
    try {
      const { enabled, intervalSec } = await readSettings();
      if (!enabled) {
        set({ phase: "off", resumeAt: null });
        failsInARow = 0;
        await wait(IDLE_CHECK_MS);
        continue;
      }
      if (!isGeminiConfigured()) {
        set({ phase: "no-key", resumeAt: null });
        await wait(IDLE_CHECK_MS);
        continue;
      }
      if (availableModels().length === 0) {
        const ms = msUntilQuotaReset() + 5 * 60_000; // a little after the reset
        set({ phase: "quota", resumeAt: new Date(Date.now() + ms).toISOString() });
        await wait(ms);
        continue;
      }

      set({ phase: "working", resumeAt: null });
      const r = await reviseNextPage();

      if (r.status === "done") {
        note("Nenhuma página pendente. Tudo transcrito.");
        set({ phase: "done", resumeAt: new Date(Date.now() + DONE_RECHECK_MS).toISOString() });
        await wait(DONE_RECHECK_MS);
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
