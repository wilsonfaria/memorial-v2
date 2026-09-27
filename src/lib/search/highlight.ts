/**
 * Client-safe helpers for search snippets. Snippets carry highlighted terms
 * between two private-use characters (never HTML), so they can be rendered
 * as <mark> elements without ever injecting markup from OCR'd text.
 */
export const MARK_START = "";
export const MARK_END = "";

export type SnippetPart = { text: string; hit: boolean };

export function splitSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const re = new RegExp(`${MARK_START}([^${MARK_END}]*)${MARK_END}`, "g");
  let last = 0;
  for (const m of snippet.matchAll(re)) {
    if (m.index > last) parts.push({ text: snippet.slice(last, m.index), hit: false });
    parts.push({ text: m[1], hit: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), hit: false });
  return parts;
}

/**
 * Lowercase, accent-free form used to match query terms against text. NFKD
 * (not NFD) so OCR ligatures like "ﬁ" also match a typed "fi".
 */
function fold(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function queryTerms(q: string): string[] {
  return [...new Set(fold(q).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3))];
}

/**
 * Crops `text` to ~`radius` characters on each side of the first query-term
 * match and marks every term occurrence in the crop (accent/case-insensitive).
 * Used for the MariaDB fallback; Meilisearch builds its own crops.
 */
export function cropAndMark(text: string, q: string, radius = 120): string {
  const terms = queryTerms(q);
  // Folding can change lengths (accents drop, ligatures expand), so match on
  // a per-character folded copy and map positions back to original chars.
  const chars = [...text];
  const folded = chars.map((c) => fold(c) || c);
  const flat = folded.join("");
  const offsets: number[] = [];
  let pos = 0;
  for (const f of folded) {
    offsets.push(pos);
    pos += f.length;
  }
  const toCharIndex = (flatIdx: number) => {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= flatIdx) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (let i = flat.indexOf(term); i !== -1; i = flat.indexOf(term, i + term.length)) {
      ranges.push([toCharIndex(i), toCharIndex(i + term.length - 1) + 1]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const center = ranges[0]?.[0] ?? 0;
  const start = Math.max(0, center - radius);
  const end = Math.min(chars.length, center + radius);

  let out = start > 0 ? "…" : "";
  let i = start;
  for (const [a, b] of ranges) {
    if (b <= i || a >= end) continue;
    const from = Math.max(a, i);
    out += chars.slice(i, from).join("") + MARK_START + chars.slice(from, Math.min(b, end)).join("") + MARK_END;
    i = Math.min(b, end);
  }
  out += chars.slice(i, end).join("") + (end < chars.length ? "…" : "");
  return out;
}
