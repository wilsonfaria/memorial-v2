import { createHash } from "node:crypto";
import { reflowText } from "@/lib/ocr-revision/reflow";

/**
 * Pure helpers for semantic search: the text a page is searched by, split
 * into passages small enough for one embedding each, and the packing of
 * those vectors for storage (page_embeddings.vectors).
 */

/**
 * The best text the page has — the AI transcription when available (rejoined
 * across column lines), else the original OCR. The keyword index and the
 * embeddings must both use exactly this, so a snippet offset means the same
 * thing in both.
 */
export function pageSearchText(p: { text: string; revisedText: string | null }): string {
  return p.revisedText ? reflowText(p.revisedText) : p.text;
}

export function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type Passage = [start: number, end: number];

/**
 * Splits text into [start, end) passages of about `target` characters, never
 * over `max`. Breaks where the meaning breaks when it can: an article heading
 * or blank line first, then a line break (OCR text is one printed line per
 * line), then a sentence end, then any space. A short tail joins the previous
 * passage instead of becoming a near-empty vector.
 */
export function splitPassages(text: string, target = 1200, max = 1800): Passage[] {
  const passages: Passage[] = [];
  let start = skipSpace(text, 0);
  while (start < text.length) {
    if (text.length - start <= max) {
      passages.push([start, trimEnd(text, text.length)]);
      break;
    }
    const end = findBreak(text, start + target, start + max);
    passages.push([start, trimEnd(text, end)]);
    start = skipSpace(text, end);
  }
  return passages.filter(([a, b]) => b > a);
}

const BREAKS = [/\n\s*\n|\n(?=###)/g, /\n/g, /[.!?;:]["”»)]?\s/g, /\s/g];

/** First break of the most meaningful kind found in [from, to]; `to` when there is none. */
function findBreak(text: string, from: number, to: number): number {
  const window = text.slice(from, to);
  for (const re of BREAKS) {
    re.lastIndex = 0;
    const m = re.exec(window);
    if (m) return from + m.index + m[0].length;
  }
  return to;
}

function skipSpace(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function trimEnd(text: string, i: number): number {
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  return i;
}

/** Vectors ⇄ Float32 little-endian bytes, `dims` numbers per vector. */
export function packVectors(vectors: number[][]): Buffer {
  const buf = Buffer.alloc(vectors.reduce((n, v) => n + v.length, 0) * 4);
  let o = 0;
  for (const v of vectors) for (const x of v) o = buf.writeFloatLE(x, o);
  return buf;
}

export function unpackVectors(buf: Uint8Array, dims: number): number[][] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: number[][] = [];
  for (let o = 0; o + dims * 4 <= buf.byteLength; o += dims * 4) {
    const v = new Array<number>(dims);
    for (let i = 0; i < dims; i++) v[i] = view.getFloat32(o + i * 4, true);
    out.push(v);
  }
  return out;
}

/**
 * Scales to unit length. Gemini only normalizes its full-size vectors; the
 * truncated ones (outputDimensionality < 3072) must be normalized by the
 * caller for cosine/dot scores to be comparable.
 */
export function normalize(v: number[]): number[] {
  const len = Math.hypot(...v);
  return len > 0 ? v.map((x) => x / len) : v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** The passage whose vector is closest to `query`; null when there are none. */
export function bestPassage(passages: Passage[], vectors: number[][], query: number[]): Passage | null {
  let best: Passage | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < Math.min(passages.length, vectors.length); i++) {
    const score = cosine(vectors[i], query);
    if (score > bestScore) {
      bestScore = score;
      best = passages[i];
    }
  }
  return best;
}

/** The start of the passage, ~36 words like the Meilisearch crops. */
export function cropPassage(text: string, [start, end]: Passage, words = 36): string {
  const passage = text.slice(start, end).replace(/\s+/g, " ").trim();
  const cut = passage.split(" ").slice(0, words).join(" ");
  return (start > 0 ? "…" : "") + cut + (cut.length < passage.length || end < text.length ? "…" : "");
}
