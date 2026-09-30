export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ProviderId = "gemini" | "groq";

export class DailyQuotaError extends Error {
  constructor(providerLabel: string, detail = "") {
    super(`Cota diária gratuita do ${providerLabel} esgotada em todos os modelos${detail ? ` (${detail})` : ""}. Continue amanhã.`);
    this.name = "DailyQuotaError";
  }
}

/**
 * Provider is overloaded or unreachable ("high demand", 500/503, network) —
 * nothing wrong with the page. Callers try another model, then wait and retry
 * later, and never mark the page as failed for it.
 */
export class ModelBusyError extends Error {
  constructor(providerLabel: string, detail = "") {
    super(`${providerLabel} sobrecarregado no momento${detail ? ` (${detail})` : ""}. Tentando de novo mais tarde.`);
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

/**
 * Everything that differs between a Gemini-shaped and a Groq-shaped
 * OpenAI-compatible provider. The call/throttle/quota-rotation machinery in
 * engine.ts is the same for both — only these knobs change.
 */
export type ProviderSpec = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  /** Env var holding the API key, when no runtime override is saved. */
  apiKeyEnvVar: string;
  /** False when the account/provider has no image-capable model — the admin UI hides it as a transcription option. */
  supportsVision: boolean;
  defaultModels: string[];
  defaultExtractModels: string[];
  /** Free-tier requests/minute for a given model — used to space requests out. */
  requestsPerMinute: (model: string) => number;
  /** Extra body params some models need/accept (e.g. Gemini's reasoning_effort). */
  extraBody?: (model: string) => Record<string, unknown>;
  /** True when a 429's body means "this model is done for the day", not "slow down". */
  isDailyQuotaText: (text: string) => boolean;
  /** Calendar key that changes when this provider's free daily quota resets (its own timezone). */
  quotaDayKey: () => string;
  /** Milliseconds from now until the next reset. */
  msUntilQuotaReset: () => number;
};
