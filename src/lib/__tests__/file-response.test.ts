import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange } from "../file-response";

test("no header or unsupported ranges serve the whole file", () => {
  assert.equal(parseRange(null, 1000), null);
  assert.equal(parseRange("bytes=0-10,20-30", 1000), null);
  assert.equal(parseRange("bytes=-", 1000), null);
});

test("parses open, closed and suffix ranges", () => {
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=900-", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=-100", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=990-5000", 1000), { start: 990, end: 999 });
});

test("unsatisfiable ranges are rejected", () => {
  assert.equal(parseRange("bytes=1000-", 1000), "invalid");
  assert.equal(parseRange("bytes=50-10", 1000), "invalid");
});
