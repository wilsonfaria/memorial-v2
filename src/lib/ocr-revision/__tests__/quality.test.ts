import { test } from "node:test";
import assert from "node:assert/strict";
import { editDistance, normalizeForComparison, scoreTranscription } from "../quality";

/** Plain O(n·m) Levenshtein, the reference the banded version must match. */
function naive(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

test("edit distance: classic cases", () => {
  assert.equal(editDistance("kitten", "sitting"), 3);
  assert.equal(editDistance("", "abc"), 3);
  assert.equal(editDistance("instrucção", "instrucção"), 0);
  assert.equal(editDistance("instrucção", "instrução"), 1);
});

test("banded edit distance matches the naive algorithm on random strings", () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const word = (n: number) => Array.from({ length: n }, () => "abcde "[Math.floor(rnd() * 6)]).join("");
  for (let k = 0; k < 200; k++) {
    const a = word(Math.floor(rnd() * 120));
    // b is a mutated copy of a (the realistic case) or unrelated
    const b = k % 3 === 0 ? word(Math.floor(rnd() * 120)) : a.split("").map((c) => (rnd() < 0.1 ? "x" : c)).join("") + word(Math.floor(rnd() * 5));
    assert.equal(editDistance(a, b), naive(a, b), `a=${a} b=${b}`);
  }
});

test("works on word arrays too", () => {
  assert.equal(editDistance("o joven Hygino Ruas".split(" "), "o jovem Hygino Ruas".split(" ")), 1);
});

test("normalization ignores layout, not content", () => {
  assert.equal(normalizeForComparison("### (Sem título)\nPara o dia\n24 deste.\n\n### PRISÃO"), "Para o dia 24 deste. PRISÃO");
});

test("score: identical texts are perfect, a modernized word is an error", () => {
  const ref = "### Ensino\nA instrucção do collegio.";
  assert.deepEqual(scoreTranscription(ref, ref).cer, 0);
  const s = scoreTranscription(ref, "### Ensino\nA instrução do colégio.");
  assert.ok(s.cer > 0 && s.cer < 0.2, `cer=${s.cer}`);
  assert.equal(s.wer, 2 / 5);
});
