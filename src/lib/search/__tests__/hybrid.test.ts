import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { searchEditionText } from "../search";
import { MARK_END, MARK_START } from "../highlight";

// Read at call time, not import time. fetch is mocked: nothing here reaches
// Meilisearch, Gemini or the database.
process.env.MEILI_URL = "http://meili.test";
process.env.MEILI_KEY = "k";
process.env.GEMINI_API_KEY = "g";

type Call = { url: string; body: Record<string, unknown> };
let calls: Call[];
let geminiStatus: number;
let meiliRejectsHybrid: boolean;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  calls = [];
  geminiStatus = 200;
  meiliRejectsHybrid = false;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ url, body });
    if (url.includes("generativelanguage.googleapis.com")) {
      if (geminiStatus !== 200) return json(geminiStatus, { error: { message: "fail" } });
      return json(200, { embeddings: body.requests.map(() => ({ values: Array(768).fill(1) })) });
    }
    if (url.endsWith("/search")) {
      if (meiliRejectsHybrid && body.hybrid) return json(400, { code: "invalid_search_embedder" });
      return json(200, {
        totalHits: 1,
        hits: [{ editionId: 7, page: 2, _formatted: { text: `a ${MARK_START}enchente${MARK_END} do rio` } }],
      });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
});

const meiliSearches = () => calls.filter((c) => c.url.endsWith("/search"));

test("sends the query vector and a hybrid clause when the query embeds", async () => {
  const res = await searchEditionText("enchente de 1954", {}, 1, 20);
  const [search] = meiliSearches();
  assert.equal(res.engine, "meilisearch");
  assert.equal(res.hybrid, true);
  assert.equal((search.body.vector as number[]).length, 768);
  assert.deepEqual(Object.keys(search.body.hybrid as object).sort(), ["embedder", "semanticRatio"]);
  assert.equal(typeof search.body.rankingScoreThreshold, "number");
  // Query task type, truncated dimensions.
  const gemini = calls.find((c) => c.url.includes("googleapis"))!;
  const [req] = gemini.body.requests as { taskType: string; outputDimensionality: number }[];
  assert.equal(req.taskType, "RETRIEVAL_QUERY");
  assert.equal(req.outputDimensionality, 768);
  // Keyword hit keeps Meilisearch's own highlighted crop.
  assert.equal(res.hits[0].semantic, undefined);
  assert.match(res.hits[0].snippet, /enchente/);
});

test("repeated queries reuse the cached vector (one Gemini call)", async () => {
  await searchEditionText("Praça da Matriz", {}, 1, 20);
  await searchEditionText("  praça   da matriz ", {}, 2, 20);
  assert.equal(calls.filter((c) => c.url.includes("googleapis")).length, 1);
  assert.equal(meiliSearches().length, 2);
});

test("keyword-only search when the embedding API fails", async () => {
  geminiStatus = 500;
  const res = await searchEditionText("festa do divino", {}, 1, 20);
  const [search] = meiliSearches();
  assert.equal(res.engine, "meilisearch");
  assert.equal(res.hybrid, false);
  assert.equal(search.body.hybrid, undefined);
  assert.equal(search.body.vector, undefined);
});

test("falls back to keywords when Meilisearch rejects the hybrid request", async () => {
  meiliRejectsHybrid = true;
  const res = await searchEditionText("baile no clube", {}, 1, 20);
  const searches = meiliSearches();
  assert.equal(searches.length, 2);
  assert.ok(searches[0].body.hybrid);
  assert.equal(searches[1].body.hybrid, undefined);
  assert.equal(res.hybrid, false);
  assert.equal(res.hits.length, 1);
});
