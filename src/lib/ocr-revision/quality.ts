import { reflowText } from "@/lib/ocr-revision/reflow";

/**
 * Transcription quality against a human-verified reference, the standard
 * way archives measure OCR/HTR:
 *  - CER (character error rate) = edit distance / reference length
 *  - WER (word error rate)      = same, over words
 * Lower is better; 0 means identical. Formatting that isn't content — the
 * "### " heading markers, "(sem título)", line breaks, repeated spaces — is
 * normalized away first so only real reading errors count.
 */

export function normalizeForComparison(text: string): string {
  return reflowText(text)
    .replace(/^###\s*\(?sem título\)?\s*$/gim, "")
    .replace(/^###\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance between two sequences, computed inside a diagonal band
 * that doubles until the answer fits in it (Ukkonen). Near-identical texts —
 * the usual case here — cost O(n·d) instead of O(n·m).
 */
export function editDistance<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const diff = Math.abs(n - m);
  for (let band = Math.max(32, diff + 1); ; band *= 2) {
    const d = bandedDistance(a, b, band);
    if (d <= band || band >= Math.max(n, m)) return d;
  }
}

function bandedDistance<T>(a: ArrayLike<T>, b: ArrayLike<T>, band: number): number {
  const n = a.length;
  const m = b.length;
  const INF = n + m + 1;
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j <= band ? j : INF;
  for (let i = 1; i <= n; i++) {
    const lo = Math.max(1, i - band);
    const hi = Math.min(m, i + band);
    cur.fill(INF);
    if (lo === 1) cur[0] = i <= band ? i : INF;
    const ai = a[i - 1];
    for (let j = lo; j <= hi; j++) {
      const sub = prev[j - 1] + (ai === b[j - 1] ? 0 : 1);
      const del = prev[j] + 1;
      const ins = cur[j - 1] + 1;
      cur[j] = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
    }
    [prev, cur] = [cur, prev];
  }
  return Math.min(prev[m], INF);
}

export type QualityScore = { cer: number; wer: number; refChars: number; refWords: number };

/** CER and WER of `hypothesis` (e.g. an AI transcription) against `reference` (human-verified). */
export function scoreTranscription(reference: string, hypothesis: string): QualityScore {
  const ref = normalizeForComparison(reference);
  const hyp = normalizeForComparison(hypothesis);
  const refWords = ref ? ref.split(" ") : [];
  const hypWords = hyp ? hyp.split(" ") : [];
  return {
    cer: ref.length ? editDistance(ref, hyp) / ref.length : hyp.length ? 1 : 0,
    wer: refWords.length ? editDistance(refWords, hypWords) / refWords.length : hypWords.length ? 1 : 0,
    refChars: ref.length,
    refWords: refWords.length,
  };
}
