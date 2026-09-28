/**
 * Minimal Meilisearch client (plain fetch — no SDK dependency) for the
 * newspaper full-text index. One document per PDF page; `distinctAttribute`
 * collapses results to one hit per edition (its best-matching page).
 *
 * Configured by MEILI_URL + MEILI_KEY (server-side only — the browser never
 * talks to Meilisearch). When they're unset, callers fall back to MariaDB
 * FULLTEXT (see search.ts).
 */

export const MEILI_INDEX = process.env.MEILI_INDEX ?? "edition_pages";

export type MeiliPageDoc = {
  id: string; // `${editionId}-${page}`
  editionId: number;
  page: number;
  /** AI-revised transcription when available, else the original OCR text */
  text: string;
  /** Original OCR text, only when `text` is the revised one — keeps it searchable for recall */
  ocrText?: string;
  title: string;
  editionNumber: number | null;
  date: string; // YYYY-MM-DD
  timestamp: number; // for sorting
  decade: number;
  year: number;
  month: number;
  day: number;
};

const SETTINGS = {
  searchableAttributes: ["text", "ocrText", "title", "editionNumber"],
  filterableAttributes: ["editionId", "decade", "year", "month", "day"],
  sortableAttributes: ["timestamp"],
  distinctAttribute: "editionId",
  displayedAttributes: ["id", "editionId", "page", "text"],
  localizedAttributes: [{ attributePatterns: ["text", "ocrText", "title"], locales: ["por"] }],
  pagination: { maxTotalHits: 5000 },
};

export function isMeiliConfigured(): boolean {
  return Boolean(process.env.MEILI_URL && process.env.MEILI_KEY);
}

/**
 * MEILI_URL without trailing slash. A value typed without a scheme
 * ("meili-host:7700") would make fetch fail with "unknown scheme", so plain
 * http:// is assumed — the usual case for Coolify's internal service URL.
 */
function meiliBaseUrl(): string {
  const raw = process.env.MEILI_URL!.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

export async function meiliFetch<T = unknown>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, ...rest } = init;
  const res = await fetch(`${meiliBaseUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MEILI_KEY}`,
      ...rest.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Meilisearch ${rest.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

type Task = { taskUid: number };

/** Waits for an enqueued Meilisearch task; throws if it failed. */
export async function waitForTask(taskUid: number, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const task = await meiliFetch<{ status: string; error?: { message: string } }>(`/tasks/${taskUid}`);
    if (task.status === "succeeded") return;
    if (task.status === "failed" || task.status === "canceled") {
      throw new Error(`Meilisearch task ${taskUid} ${task.status}: ${task.error?.message ?? ""}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Meilisearch task ${taskUid} still pending after ${timeoutMs}ms`);
}

let ensured: Promise<void> | null = null;

/** Creates the index (if missing) and applies its settings — once per process. */
export function ensureMeiliIndex(): Promise<void> {
  ensured ??= (async () => {
    try {
      await meiliFetch(`/indexes/${MEILI_INDEX}`);
    } catch {
      const created = await meiliFetch<Task>("/indexes", {
        method: "POST",
        body: JSON.stringify({ uid: MEILI_INDEX, primaryKey: "id" }),
      });
      await waitForTask(created.taskUid);
    }
    const updated = await meiliFetch<Task>(`/indexes/${MEILI_INDEX}/settings`, {
      method: "PATCH",
      body: JSON.stringify(SETTINGS),
    });
    await waitForTask(updated.taskUid, 120000);
  })().catch((err) => {
    ensured = null; // retry next time
    throw err;
  });
  return ensured;
}

export async function upsertDocuments(docs: MeiliPageDoc[]): Promise<number | null> {
  if (docs.length === 0) return null;
  await ensureMeiliIndex();
  const task = await meiliFetch<Task>(`/indexes/${MEILI_INDEX}/documents`, {
    method: "POST",
    body: JSON.stringify(docs),
    timeoutMs: 60000,
  });
  return task.taskUid;
}

export async function deleteEditionDocuments(editionIds: number[]): Promise<number | null> {
  if (editionIds.length === 0) return null;
  await ensureMeiliIndex();
  const task = await meiliFetch<Task>(`/indexes/${MEILI_INDEX}/documents/delete`, {
    method: "POST",
    body: JSON.stringify({ filter: `editionId IN [${editionIds.join(", ")}]` }),
  });
  return task.taskUid;
}

export async function deleteAllDocuments(): Promise<number> {
  await ensureMeiliIndex();
  const task = await meiliFetch<Task>(`/indexes/${MEILI_INDEX}/documents`, { method: "DELETE" });
  return task.taskUid;
}

export type MeiliStatus =
  | { state: "ok"; numberOfDocuments: number; pendingTasks: number }
  | { state: "no-index" } // reachable, key accepted, index not created yet (before the first indexing)
  | { state: "unreachable" | "bad-key" | "error"; detail: string };

/**
 * Health + index stats for the admin panel, telling apart "can't reach the
 * server", "server rejects MEILI_KEY" and "index simply not created yet"
 * (normal on a fresh Meilisearch) instead of lumping them as "down".
 */
export async function getMeiliStatus(): Promise<MeiliStatus> {
  const base = meiliBaseUrl();
  const headers = { Authorization: `Bearer ${process.env.MEILI_KEY}` };
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!health.ok) return { state: "unreachable", detail: `${base}/health respondeu ${health.status}` };
  } catch (err) {
    return { state: "unreachable", detail: `${base}: ${(err as Error).cause ?? (err as Error).message}` };
  }
  try {
    const res = await fetch(`${base}/indexes/${MEILI_INDEX}/stats`, {
      headers,
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) return { state: "bad-key", detail: `HTTP ${res.status}` };
    if (res.status === 404) return { state: "no-index" };
    if (!res.ok) return { state: "error", detail: `stats → HTTP ${res.status}` };
    const stats = (await res.json()) as { numberOfDocuments: number };
    const pending = await meiliFetch<{ total: number }>(
      `/tasks?statuses=enqueued,processing&indexUids=${MEILI_INDEX}&limit=1`,
      { timeoutMs: 3000 }
    );
    return { state: "ok", numberOfDocuments: stats.numberOfDocuments, pendingTasks: pending.total };
  } catch (err) {
    return { state: "error", detail: (err as Error).message };
  }
}
