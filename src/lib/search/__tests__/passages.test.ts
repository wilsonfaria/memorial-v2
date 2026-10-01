import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestPassage,
  cosine,
  cropPassage,
  normalize,
  packVectors,
  pageSearchText,
  splitPassages,
  textHash,
  unpackVectors,
} from "../passages";

const line = (n: number) => `Linha ${n} do jornal com algumas palavras impressas na coluna`;

test("short text is a single passage, trimmed", () => {
  assert.deepEqual(splitPassages("  \n Enchente no rio.  \n"), [[4, 20]]);
  assert.deepEqual(splitPassages(""), []);
  assert.deepEqual(splitPassages("   \n\n  "), []);
});

test("passages cover the text in order, within the size limits", () => {
  const text = Array.from({ length: 120 }, (_, i) => line(i)).join("\n");
  const passages = splitPassages(text, 1200, 1800);
  assert.ok(passages.length > 3);
  let prevEnd = 0;
  for (const [a, b] of passages) {
    assert.ok(a >= prevEnd, "no overlap, in order");
    assert.ok(b - a <= 1800, `passage of ${b - a} chars`);
    assert.equal(text.slice(prevEnd, a).trim(), "", "nothing but whitespace is skipped");
    prevEnd = b;
  }
  assert.equal(prevEnd, text.length);
  // OCR text breaks at line ends, never mid-line.
  for (const [a] of passages) assert.ok(a === 0 || text[a - 1] === "\n");
});

test("prefers an article heading or blank line over a line break", () => {
  const first = Array.from({ length: 22 }, (_, i) => line(i)).join("\n"); // ~1350 chars
  const text = `${first}\n\n### Notas sociais\n${line(99)}\n${"x ".repeat(600)}`;
  const [[, end], [nextStart]] = splitPassages(text, 1200, 1800);
  assert.equal(text.slice(nextStart, nextStart + 3), "###");
  assert.equal(end, first.length);
});

test("a text with no breaks at all is still cut at max", () => {
  const passages = splitPassages("a".repeat(5000), 1200, 1800);
  assert.ok(passages.every(([a, b]) => b - a <= 1800));
  assert.equal(passages.at(-1)![1], 5000);
});

test("search text is the reflowed transcription when there is one", () => {
  assert.equal(pageSearchText({ text: "ocr", revisedText: null }), "ocr");
  assert.equal(pageSearchText({ text: "ocr", revisedText: "abasteci-\nmento" }), "abastecimento");
});

test("hash changes with the text", () => {
  assert.equal(textHash("a"), textHash("a"));
  assert.notEqual(textHash("a"), textHash("b"));
  assert.equal(textHash("a").length, 64);
});

test("vectors survive packing (float32 precision)", () => {
  const vectors = [
    [0.5, -0.25, 1],
    [0.1, 0.2, 0.3],
  ];
  const back = unpackVectors(new Uint8Array(packVectors(vectors)), 3);
  assert.equal(back.length, 2);
  back.flat().forEach((x, i) => assert.ok(Math.abs(x - vectors.flat()[i]) < 1e-6));
  assert.deepEqual(unpackVectors(new Uint8Array(0), 3), []);
});

test("normalize gives unit vectors; cosine compares directions", () => {
  const v = normalize([3, 4]);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-12);
  assert.deepEqual(normalize([0, 0]), [0, 0]);
  assert.ok(Math.abs(cosine([1, 0], [2, 0]) - 1) < 1e-12);
  assert.equal(cosine([1, 0], [0, 1]), 0);
});

test("bestPassage picks the passage closest to the query", () => {
  const passages: [number, number][] = [
    [0, 10],
    [11, 20],
    [21, 30],
  ];
  const vectors = [
    [1, 0],
    [0, 1],
    [0.7, 0.7],
  ];
  assert.deepEqual(bestPassage(passages, vectors, [0.1, 1]), [11, 20]);
  assert.equal(bestPassage([], [], [1, 0]), null);
});

test("cropPassage shows the passage start with ellipses where text was cut", () => {
  const text = "Antes. As aguas do rio invadiram a cidade inteira. Depois.";
  const start = text.indexOf("As");
  const end = text.indexOf(" Depois");
  assert.equal(cropPassage(text, [start, end]), "…As aguas do rio invadiram a cidade inteira.…");
  assert.equal(cropPassage(text, [start, end], 3), "…As aguas do…");
  assert.equal(cropPassage("Tudo aqui.", [0, 10]), "Tudo aqui.");
});
