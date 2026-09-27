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
  text: string;
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
  searchableAttributes: ["text", "title", "editionNumber"],
  filterableAttributes: ["editionId", "decade", "year", "month", "day"],
  sortableAttributes: ["timestamp"],
  distinctAttribute: "editionId",
  displayedAttributes: ["id", "editionId", "page", "text"],
  localizedAttributes: [{ attributePatterns: ["text", "title"], locales: ["por"] }],
  pagination: { maxTotalHits: 5000 },
};

export function isMeiliConfigured(): boolean {
  return Boolean(process.env.MEILI_URL && process.env.MEILI_KEY);
}

export async function meiliFetch<T = unknown>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, ...rest } = init;
  const res = await fetch(`${process.env.MEILI_URL!.replace(/\/$/, "")}${path}`, {
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

/** Document count plus how many tasks are still queued — right after a reindex the count lags behind. */
export async function getIndexStats(): Promise<{ numberOfDocuments: number; pendingTasks: number } | null> {
  try {
    const [stats, pending] = await Promise.all([
      meiliFetch<{ numberOfDocuments: number }>(`/indexes/${MEILI_INDEX}/stats`, { timeoutMs: 3000 }),
      meiliFetch<{ total: number }>(`/tasks?statuses=enqueued,processing&indexUids=${MEILI_INDEX}&limit=1`, {
        timeoutMs: 3000,
      }),
    ]);
    return { numberOfDocuments: stats.numberOfDocuments, pendingTasks: pending.total };
  } catch {
    return null;
  }
}
