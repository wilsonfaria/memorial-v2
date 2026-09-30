import type { ProviderSpec } from "./types";

/**
 * Milliseconds until the next daily reset at a given hour in a given IANA
 * timezone (Google resets Gemini's free quotas at midnight Pacific; Groq's
 * console describes its daily limits resetting at midnight UTC).
 */
function msUntilMidnight(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  return 24 * 3600 * 1000 - elapsed;
}

function dayKey(timeZone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

/**
 * Only 3.x models that passed the fidelity probe (period spellings kept, none
 * modernized) are in the default list. Left out on purpose: gemini-3-flash
 * (wrote "instrução"), gemini-3.5-flash-lite (passed, but answers 503 "high
 * demand" most of the time), 2.x and Gemma (older / failed earlier tests).
 * See scripts/ocr-pilot.ts.
 */
export const GEMINI_SPEC: ProviderSpec = {
  id: "gemini",
  label: "Gemini",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKeyEnvVar: "GEMINI_API_KEY",
  supportsVision: true,
  defaultModels: (
    process.env.GEMINI_MODELS ??
    "gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash,gemini-3.8-flash"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  // Cheap Flash Lite, one request per page — see src/lib/entities. Gemma was
  // tried (bigger quota) but took minutes per page or failed with internal
  // errors; gemini-3.5-flash-lite lives on 503 "high demand".
  defaultExtractModels: (process.env.GEMINI_EXTRACT_MODELS ?? "gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  // Free-tier requests per minute (AI Studio → Rate limits): Flash Lite 15, Flash 5.
  requestsPerMinute: (model) => {
    const override = Number(process.env.GEMINI_MIN_INTERVAL_MS);
    if (override > 0) return 60_000 / override;
    return /flash-lite/.test(model) ? 15 : 5;
  },
  // Gemini 3 thinking can't be turned off, only lowered; Gemma models reject the parameter altogether.
  extraBody: (model) => (model.startsWith("gemini") ? { reasoning_effort: "low" } : {}),
  // quotaId "GenerateRequestsPerDayPerProjectPerModel-FreeTier" = this model is done for today.
  isDailyQuotaText: (text) => /PerDay/i.test(text),
  quotaDayKey: () => dayKey("America/Los_Angeles"),
  msUntilQuotaReset: () => msUntilMidnight("America/Los_Angeles"),
};

/**
 * Groq (fast Llama/OSS inference, not to be confused with xAI's Grok). Same
 * OpenAI-compatible /chat/completions shape as Gemini, so it reuses the same
 * engine untouched.
 *
 * Checked against the real account on 2026-09-30 (GET /v1/models): no
 * image-capable model is available (just gpt-oss-120b/20b, qwen3.8-27b,
 * allam-2-7b, Whisper, Orpheus) — so `defaultModels` (the transcription
 * list) is empty on purpose and `supportsVision` is false. Only text-only
 * extraction (GROQ_EXTRACT_MODELS) is realistic today. A same-day quality
 * probe of gpt-oss-120b on the real extraction prompt returned valid JSON
 * but with worse title/body segmentation than Gemini (titles absorbing body
 * text, one article split mid-sentence) — treat as unverified until it's
 * been run through the same CER/WER gold-set process as the vision models
 * (see /admin/edicoes/qualidade) before relying on it.
 *
 * Model IDs and free-tier limits move fast on Groq's console — re-check
 * with `GET https://api.groq.com/openai/v1/models` if this list goes stale.
 * Daily reset time is assumed UTC (not published as precisely as Google's
 * Pacific-time one) — adjust GROQ_QUOTA_RESET_TZ if it seems to trigger at
 * the wrong time in practice.
 */
export const GROQ_SPEC: ProviderSpec = {
  id: "groq",
  label: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  apiKeyEnvVar: "GROQ_API_KEY",
  supportsVision: false,
  defaultModels: (process.env.GROQ_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  defaultExtractModels: (process.env.GROQ_EXTRACT_MODELS ?? "openai/gpt-oss-120b")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  requestsPerMinute: () => {
    const override = Number(process.env.GROQ_MIN_INTERVAL_MS);
    if (override > 0) return 60_000 / override;
    return 25; // conservative default below the common free-tier ~30 rpm cap
  },
  isDailyQuotaText: (text) => /per day|requests per day|tokens per day|\bRPD\b|\bTPD\b/i.test(text),
  quotaDayKey: () => dayKey(process.env.GROQ_QUOTA_RESET_TZ ?? "UTC"),
  msUntilQuotaReset: () => msUntilMidnight(process.env.GROQ_QUOTA_RESET_TZ ?? "UTC"),
};

export const PROVIDER_SPECS: ProviderSpec[] = [GEMINI_SPEC, GROQ_SPEC];
