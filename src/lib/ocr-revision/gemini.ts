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
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.6-flash,gemini-3.8-flash")
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

/** model → day (YYYY-MM-DD, Pacific time — when Google resets free quotas) it ran out */
const exhausted = new Map<string, string>();
const quotaDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export function availableModels(): string[] {
  const today = quotaDay();
  return GEMINI_MODELS.filter((m) => exhausted.get(m) !== today);
}

class ModelDailyQuota extends Error {}

const MAX_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(model: string, jpeg: Buffer, instructions: string): Promise<string> {
  const body = JSON.stringify({
    model,
    max_tokens: 8192,
    temperature: 0.2,
    // Gemini 3 thinking can't be turned off, only lowered; Gemma models
    // reject the parameter altogether.
    ...(model.startsWith("gemini") ? { reasoning_effort: "low" } : {}),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instructions },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
        ],
      },
    ],
  });

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(5000 * attempt);
        continue;
      }
      throw err;
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
    if ((res.status === 500 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      await sleep(5000 * attempt);
      continue;
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
  for (const model of availableModels()) {
    try {
      return { text: await callModel(model, jpeg, instructions), model };
    } catch (err) {
      if (err instanceof ModelDailyQuota) {
        exhausted.set(model, quotaDay());
        continue;
      }
      throw err;
    }
  }
  throw new DailyQuotaError(GEMINI_MODELS.join(", "));
}
