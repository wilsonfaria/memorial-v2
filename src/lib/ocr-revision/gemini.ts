/**
 * Google Gemini API (free tier) via its OpenAI-compatible endpoint, used to
 * transcribe newspaper page images. Server-side only: GEMINI_API_KEY never
 * reaches the browser.
 *
 * Free-tier quotas are per MODEL and per day (e.g. gemini-3.8-flash allows
 * only 20 requests/day), so we rotate through a preference-ordered list
 * (GEMINI_MODELS, comma-separated): when one model's daily quota runs out we
 * move on to the next, and only give up for the day when all are exhausted.
 * Default order comes from scripts/ocr-pilot.ts measurements — all 16/16 on
 * period spellings ("instrucção", "idéa", "Collegio", "annunciado"…).
 *
 * Limits come in two kinds:
 *  - per minute → wait the retry delay Google suggests and try again;
 *  - per day    → mark that model exhausted until tomorrow, try the next one.
 *
 * Every request also goes through a per-model throttle kept below the free
 * tier's per-minute limit (Flash Lite 15/min, Flash 5/min), so neither the
 * admin runs nor the background worker ever trip it.
 *
 * Only 3.x models that passed the fidelity probe (period spellings kept, none
 * modernized) are in the default list. Left out on purpose: gemini-3-flash
 * (wrote "instrução"), 2.x and Gemma (older / failed earlier tests).
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_MODELS = (
  process.env.GEMINI_MODELS ??
  "gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export class DailyQuotaError extends Error {
  constructor(detail = "") {
    super(`Cota diária gratuita do Gemini esgotada em todos os modelos${detail ? ` (${detail})` : ""}. Continue amanhã.`);
    this.name = "DailyQuotaError";
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Process-wide state. Next.js loads this module in more than one bundle
 * (instrumentation for the background worker, the app for admin actions), so
 * it lives on globalThis — otherwise each copy would throttle on its own.
 */
type GeminiShared = {
  /** model → day (YYYY-MM-DD, Pacific time — when Google resets free quotas) it ran out */
  exhausted: Map<string, string>;
  /** model → earliest time its next request may start (throttle). */
  nextSlot: Map<string, number>;
};
const shared: GeminiShared = ((globalThis as { __memorialGemini?: GeminiShared }).__memorialGemini ??= {
  exhausted: new Map(),
  nextSlot: new Map(),
});
const exhausted = shared.exhausted;
const quotaDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

/** Free-tier requests per minute (AI Studio → Rate limits): Flash Lite 15, Flash 5. */
function requestsPerMinute(model: string): number {
  return /flash-lite/.test(model) ? 15 : 5;
}

/** Spacing between requests to one model: its per-minute limit with ~15% slack. */
function intervalMs(model: string): number {
  const override = Number(process.env.GEMINI_MIN_INTERVAL_MS);
  if (override > 0) return override;
  return Math.ceil((60_000 / requestsPerMinute(model)) * 1.15);
}

/** Waits for this model's turn; concurrent callers queue up one interval apart. */
async function throttle(model: string): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, shared.nextSlot.get(model) ?? 0);
  shared.nextSlot.set(model, slot + intervalMs(model));
  if (slot > now) await sleep(slot - now);
}

/** Milliseconds until Google resets the free daily quotas (midnight Pacific time). */
export function msUntilQuotaReset(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  return 24 * 3600 * 1000 - elapsed;
}

export function availableModels(): string[] {
  const today = quotaDay();
  return GEMINI_MODELS.filter((m) => exhausted.get(m) !== today);
}

class ModelDailyQuota extends Error {}

/**
 * Google is overloaded or unreachable ("high demand", 500/503, network) —
 * nothing wrong with the page. Callers try another model, then wait and retry
 * later, and never mark the page as failed for it.
 */
export class ModelBusyError extends Error {
  constructor(detail = "") {
    super(`Gemini sobrecarregado no momento${detail ? ` (${detail})` : ""}. Tentando de novo mais tarde.`);
    this.name = "ModelBusyError";
  }
}

/** Errors saved before ModelBusyError existed that were really just overload. */
export const TRANSIENT_ERROR = /HTTP 50[03]|high demand|overloaded|fetch failed|timeout|ECONNRESET|EAI_AGAIN/i;

/**
 * Prisma filter for "no error yet, or only an overload error" on a text
 * column — so pages marked failed by a mere 503 go back into the queue.
 */
export function noRealError(field: "revisionError" | "entitiesError") {
  const transient = ["HTTP 503", "HTTP 500", "high demand", "fetch failed", "sobrecarregado"];
  return { OR: [{ [field]: null }, ...transient.map((t) => ({ [field]: { contains: t } }))] };
}

/** Overload retries on the same model before moving on to the next one. */
const BUSY_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const MAX_ATTEMPTS = 5;

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

async function callModel(
  model: string,
  content: ContentPart[],
  { json = false, temperature = 0.2, maxTokens = 8192 }: { json?: boolean; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    // Gemini 3 thinking can't be turned off, only lowered; Gemma models
    // reject the parameter altogether.
    ...(model.startsWith("gemini") ? { reasoning_effort: "low" } : {}),
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [{ role: "user", content }],
  });

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    await throttle(model);
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      if (attempt < BUSY_ATTEMPTS) {
        await sleep(5000 * attempt);
        continue;
      }
      throw new ModelBusyError(`${model}: ${(err as Error).message.slice(0, 80)}`);
    }

    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      // Some models (e.g. Gemma) inline their reasoning; keep only the answer.
      return (data.choices?.[0]?.message?.content ?? "")
        .replace(/<(thought|think)>[\s\S]*?<\/\1>/g, "")
        .trim();
    }

    const text = await res.text();
    if (res.status === 429) {
      // quotaId "GenerateRequestsPerDayPerProjectPerModel-FreeTier" = this model is done for today.
      if (/PerDay/i.test(text)) throw new ModelDailyQuota(model);
      if (attempt < MAX_ATTEMPTS) {
        const delay = Number(text.match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1] ?? 20 * attempt);
        await sleep(Math.min(Math.max(delay, 5), 90) * 1000);
        continue;
      }
      throw new ModelDailyQuota(model); // persistent throttling: rest this model for today
    }
    if (res.status === 500 || res.status === 503) {
      if (attempt < BUSY_ATTEMPTS) {
        await sleep(5000 * attempt);
        continue;
      }
      throw new ModelBusyError(`${model} HTTP ${res.status}`);
    }
    throw new Error(`Gemini (${model}) HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Transcribes one image with the first model that still has quota today.
 * Returns the text and the model that produced it. Throws DailyQuotaError
 * only when every model in GEMINI_MODELS is exhausted.
 */
export async function transcribeImage(jpeg: Buffer, instructions: string): Promise<{ text: string; model: string }> {
  const content: ContentPart[] = [
    { type: "text", text: instructions },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
  ];
  let busy: ModelBusyError | null = null;
  for (const model of availableModels()) {
    try {
      return { text: await callModel(model, content), model };
    } catch (err) {
      if (err instanceof ModelDailyQuota) {
        exhausted.set(model, quotaDay());
        continue;
      }
      if (err instanceof ModelBusyError) {
        busy = err; // overloaded: try the next model
        continue;
      }
      throw err;
    }
  }
  throw busy ?? new DailyQuotaError(GEMINI_MODELS.join(", "));
}

/**
 * Models for text-only structured extraction (src/lib/entities): the cheap
 * Flash Lite ones, one request per page. Gemma was tried (bigger quota) but
 * took minutes per page or failed with internal errors.
 */
export const GEMINI_EXTRACT_MODELS = (process.env.GEMINI_EXTRACT_MODELS ?? "gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function availableExtractModels(): string[] {
  const today = quotaDay();
  return GEMINI_EXTRACT_MODELS.filter((m) => exhausted.get(m) !== today);
}

/** Text prompt → JSON answer, rotating through GEMINI_EXTRACT_MODELS like transcribeImage. */
export async function generateJson(prompt: string): Promise<{ json: unknown; model: string }> {
  let busy: ModelBusyError | null = null;
  for (const model of availableExtractModels()) {
    try {
      const raw = await callModel(model, [{ type: "text", text: prompt }], {
        json: true,
        temperature: 0.1,
        maxTokens: 32768, // a busy page lists dozens of items and names
      });
      // Some models answer with a bare array instead of the requested object.
      const start = raw.search(/[[{]/);
      const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
      try {
        return { json: JSON.parse(raw.slice(start, end + 1)), model };
      } catch {
        throw new Error(`Resposta do ${model} não é JSON válido: ${raw.slice(0, 200)}`);
      }
    } catch (err) {
      if (err instanceof ModelDailyQuota) {
        exhausted.set(model, quotaDay());
        continue;
      }
      if (err instanceof ModelBusyError) {
        busy = err;
        continue;
      }
      throw err;
    }
  }
  throw busy ?? new DailyQuotaError(GEMINI_EXTRACT_MODELS.join(", "));
}
