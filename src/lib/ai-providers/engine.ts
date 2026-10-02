import { DailyQuotaError, ModelBusyError, type ContentPart, type ProviderSpec } from "./types";

/**
 * Process-wide state, keyed by `${providerId}:${model}` so two providers
 * never share a throttle/quota slot. Next.js loads this module in more than
 * one bundle (instrumentation for the background worker, the app for admin
 * actions), so it lives on globalThis — otherwise each copy would throttle
 * on its own.
 */
type EngineShared = {
  /** "providerId:model" → day key (per the provider's own reset clock) it ran out */
  exhausted: Map<string, string>;
  /** "providerId:model" → earliest time its next request may start (throttle). */
  nextSlot: Map<string, number>;
};
const shared: EngineShared = ((globalThis as { __memorialAiEngine?: EngineShared }).__memorialAiEngine ??= {
  exhausted: new Map(),
  nextSlot: new Map(),
});

function key(spec: ProviderSpec, model: string) {
  return `${spec.id}:${model}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Spacing between requests to one model: its per-minute limit with ~15% slack. */
function intervalMs(spec: ProviderSpec, model: string, minIntervalOverrideMs?: number): number {
  if (minIntervalOverrideMs && minIntervalOverrideMs > 0) return minIntervalOverrideMs;
  return Math.ceil((60_000 / spec.requestsPerMinute(model)) * 1.15);
}

/** Waits for this model's turn; concurrent callers queue up one interval apart. */
async function throttle(spec: ProviderSpec, model: string, minIntervalOverrideMs?: number): Promise<void> {
  const k = key(spec, model);
  const now = Date.now();
  const slot = Math.max(now, shared.nextSlot.get(k) ?? 0);
  shared.nextSlot.set(k, slot + intervalMs(spec, model, minIntervalOverrideMs));
  if (slot > now) await sleep(slot - now);
}

export function availableModels(spec: ProviderSpec, models: string[]): string[] {
  const today = spec.quotaDayKey();
  return models.filter((m) => shared.exhausted.get(key(spec, m)) !== today);
}

/**
 * Clears the exhausted/throttle state for one provider. The exhausted map is
 * keyed only by provider+model, not by which API key was in use — so a model
 * marked "out of quota today" under an old/bad key stays marked even after
 * the admin saves a new one, and every call keeps failing without ever
 * trying it. Called whenever a provider's config is saved in the admin, so a
 * key change always gets a clean attempt.
 */
export function resetProviderState(spec: ProviderSpec): void {
  const prefix = `${spec.id}:`;
  for (const k of [...shared.exhausted.keys()]) if (k.startsWith(prefix)) shared.exhausted.delete(k);
  for (const k of [...shared.nextSlot.keys()]) if (k.startsWith(prefix)) shared.nextSlot.delete(k);
}

class ModelDailyQuota extends Error {}

const BUSY_ATTEMPTS = 3;
const MAX_ATTEMPTS = 5;

async function callModel(
  spec: ProviderSpec,
  apiKey: string,
  model: string,
  content: ContentPart[],
  {
    json = false,
    temperature = 0.2,
    maxTokens = 8192,
    minIntervalOverrideMs,
  }: { json?: boolean; temperature?: number; maxTokens?: number; minIntervalOverrideMs?: number } = {}
): Promise<string> {
  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(spec.extraBody?.(model) ?? {}),
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [{ role: "user", content }],
  });

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    await throttle(spec, model, minIntervalOverrideMs);
    try {
      res = await fetch(`${spec.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      if (attempt < BUSY_ATTEMPTS) {
        await sleep(5000 * attempt);
        continue;
      }
      throw new ModelBusyError(spec.label, `${model}: ${(err as Error).message.slice(0, 80)}`);
    }

    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      // Some models (e.g. Gemma, DeepSeek-distill) inline their reasoning; keep only the answer.
      return (data.choices?.[0]?.message?.content ?? "")
        .replace(/<(thought|think)>[\s\S]*?<\/\1>/g, "")
        .trim();
    }

    const text = await res.text();
    if (res.status === 429) {
      if (spec.isDailyQuotaText(text)) throw new ModelDailyQuota(model);
      if (attempt < MAX_ATTEMPTS) {
        const retryAfterHeader = Number(res.headers.get("retry-after"));
        const delay =
          Number(text.match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1]) ||
          Number(text.match(/try again in ([\d.]+)s/i)?.[1]) ||
          retryAfterHeader ||
          20 * attempt;
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
      throw new ModelBusyError(spec.label, `${model} HTTP ${res.status}`);
    }
    throw new Error(`${spec.label} (${model}) HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Transcribes one image with the first model (in `models`) that still has
 * quota today. Returns the text and the model that produced it. Throws
 * DailyQuotaError only when every model is exhausted.
 */
export async function transcribeImage(
  spec: ProviderSpec,
  apiKey: string,
  models: string[],
  jpeg: Buffer,
  instructions: string,
  minIntervalOverrideMs?: number
): Promise<{ text: string; model: string }> {
  const content: ContentPart[] = [
    { type: "text", text: instructions },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
  ];
  let busy: ModelBusyError | null = null;
  for (const model of availableModels(spec, models)) {
    try {
      return { text: await callModel(spec, apiKey, model, content, { minIntervalOverrideMs }), model };
    } catch (err) {
      if (err instanceof ModelDailyQuota) {
        shared.exhausted.set(key(spec, model), spec.quotaDayKey());
        continue;
      }
      if (err instanceof ModelBusyError) {
        busy = err; // overloaded: try the next model
        continue;
      }
      throw err;
    }
  }
  throw busy ?? new DailyQuotaError(spec.label, models.join(", "));
}

/** Text prompt → JSON answer, rotating through `models` like transcribeImage. */
export async function generateJson(
  spec: ProviderSpec,
  apiKey: string,
  models: string[],
  prompt: string,
  minIntervalOverrideMs?: number
): Promise<{ json: unknown; model: string }> {
  let busy: ModelBusyError | null = null;
  for (const model of availableModels(spec, models)) {
    try {
      const raw = await callModel(spec, apiKey, model, [{ type: "text", text: prompt }], {
        json: true,
        temperature: 0.1,
        maxTokens: 32768, // a busy page lists dozens of items and names
        minIntervalOverrideMs,
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
        shared.exhausted.set(key(spec, model), spec.quotaDayKey());
        continue;
      }
      if (err instanceof ModelBusyError) {
        busy = err;
        continue;
      }
      throw err;
    }
  }
  throw busy ?? new DailyQuotaError(spec.label, models.join(", "));
}

/**
 * A single, cheap real call — used by the admin panel to test a key before
 * saving it. Deliberately plain text, not JSON mode: reasoning models (e.g.
 * Groq's gpt-oss) spend hundreds of hidden "thinking" tokens before the
 * answer, and providers that validate response_format: json_object
 * server-side reject a reply truncated mid-thought. All this needs to prove
 * is that the key/model combination answers at all.
 */
export async function pingProvider(spec: ProviderSpec, apiKey: string, model: string): Promise<void> {
  const text = await callModel(spec, apiKey, model, [{ type: "text", text: "Responda apenas com a palavra: ok" }], {
    maxTokens: 500,
    temperature: 0,
  });
  if (!text.trim()) throw new Error("resposta vazia do modelo");
}
