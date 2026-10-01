import { geminiApiKey, GEMINI_SPEC } from "@/lib/ai-providers/registry";
import { DailyQuotaError, ModelBusyError } from "@/lib/ai-providers/types";
import { normalize } from "@/lib/search/passages";

/**
 * Gemini embeddings for semantic search (native batchEmbedContents — the
 * OpenAI-compatible endpoint has no taskType, and document vs. query task
 * types measurably improve retrieval). Vectors are truncated to EMBED_DIMS
 * and normalized here, so every caller gets unit vectors.
 */

export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
export const EMBED_DIMS = 768;
/** Name of the userProvided embedder in the Meilisearch index settings. */
export const MEILI_EMBEDDER = "gemini";
/** batchEmbedContents accepts at most 100 texts per request. */
export const MAX_BATCH = 100;

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

type EmbedShared = {
  /** Gemini quota day (Pacific) the embedding model ran out on. */
  exhaustedDay: string | null;
  /** Query text → vector, most recently used last. */
  queryCache: Map<string, number[]>;
};
// On globalThis: the background worker and the search page load this module
// in different bundles and must agree on the quota state.
const shared: EmbedShared = ((globalThis as { __memorialEmbed?: EmbedShared }).__memorialEmbed ??= {
  exhaustedDay: null,
  queryCache: new Map(),
});

export function isEmbeddingConfigured(): boolean {
  return Boolean(geminiApiKey()) && process.env.SEMANTIC_SEARCH !== "off";
}

export function isEmbeddingQuotaExhausted(): boolean {
  return shared.exhaustedDay === GEMINI_SPEC.quotaDayKey();
}

export async function embedTexts(texts: string[], taskType: TaskType, timeoutMs = 60_000): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH) throw new Error(`embedTexts: no máximo ${MAX_BATCH} textos por chamada.`);
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error("Gemini: nenhuma chave de API configurada (busca semântica).");
  if (isEmbeddingQuotaExhausted()) throw new DailyQuotaError(GEMINI_SPEC.label, EMBED_MODEL);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBED_DIMS,
      })),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err: Error) => {
    throw new ModelBusyError(GEMINI_SPEC.label, `${EMBED_MODEL}: ${err.message.slice(0, 80)}`);
  });

  if (res.ok) {
    const data = (await res.json()) as { embeddings?: { values: number[] }[] };
    const vectors = data.embeddings?.map((e) => normalize(e.values)) ?? [];
    if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBED_DIMS)) {
      throw new Error(`${EMBED_MODEL} devolveu ${vectors.length} vetores para ${texts.length} textos.`);
    }
    return vectors;
  }

  const body = await res.text();
  if (res.status === 429) {
    if (GEMINI_SPEC.isDailyQuotaText(body)) {
      shared.exhaustedDay = GEMINI_SPEC.quotaDayKey();
      throw new DailyQuotaError(GEMINI_SPEC.label, EMBED_MODEL);
    }
    const retryS = Number(body.match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1]) || 60;
    throw new EmbedRateLimitError(retryS * 1000);
  }
  if (res.status >= 500) throw new ModelBusyError(GEMINI_SPEC.label, `${EMBED_MODEL} HTTP ${res.status}`);
  throw new Error(`${EMBED_MODEL} HTTP ${res.status}: ${body.slice(0, 300)}`);
}

/** Per-minute limit (requests or tokens) hit — wait `retryAfterMs` and try again. */
export class EmbedRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Limite por minuto do ${EMBED_MODEL} atingido; nova tentativa em ${Math.round(retryAfterMs / 1000)}s.`);
    this.name = "EmbedRateLimitError";
  }
}

const QUERY_CACHE_SIZE = 500;
const QUERY_TIMEOUT_MS = 1500;

/**
 * Vector for a search box query, or null when it can't be had quickly (no
 * key, quota gone, slow or failing API) — the search then just runs on
 * keywords. Never throws. Repeated queries are served from memory: each
 * public search would otherwise spend one request of the daily quota.
 */
export async function embedQuery(q: string): Promise<number[] | null> {
  const key = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key || !isEmbeddingConfigured() || isEmbeddingQuotaExhausted()) return null;
  const cached = shared.queryCache.get(key);
  if (cached) {
    shared.queryCache.delete(key);
    shared.queryCache.set(key, cached);
    return cached;
  }
  try {
    const [vector] = await embedTexts([key], "RETRIEVAL_QUERY", QUERY_TIMEOUT_MS);
    shared.queryCache.set(key, vector);
    if (shared.queryCache.size > QUERY_CACHE_SIZE) {
      shared.queryCache.delete(shared.queryCache.keys().next().value!);
    }
    return vector;
  } catch (err) {
    console.error("Busca semântica indisponível — só palavra-chave:", (err as Error).message);
    return null;
  }
}
