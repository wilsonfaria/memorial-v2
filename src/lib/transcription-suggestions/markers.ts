/**
 * Pure helpers for the "[ilegível]" corrections visitors suggest: finding
 * each marker in a page's transcription, the text around it, and putting an
 * approved reading in its place. Works on the stored revisedText; the reader
 * shows it reflowed (reflow.ts), which keeps every marker in the same order.
 */

export const ILLEGIBLE = "[ilegível]";
const CONTEXT_CHARS = 80;

export type Marker = { occurrence: number; start: number; end: number; before: string; after: string };

/** Whitespace-collapsed, so context taken from the raw and the reflowed text compare equal. */
export function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * True when the words a visitor saw before a marker (reflowed text, which
 * rejoins "abasteci-\nmento") are the end of the stored context. Compared
 * without spaces and hyphens so the reflow makes no difference.
 */
export function seenBeforeMatches(contextBefore: string, seenBefore: string): boolean {
  const compact = (s: string) => s.replace(/[\s\-‐–—]+/g, "");
  return compact(contextBefore).endsWith(compact(seenBefore));
}

/**
 * Each marker with up to CONTEXT_CHARS of text on each side — stopping at a
 * neighbouring marker, so correcting one gap doesn't change the context of
 * the next one in the same sentence.
 */
export function findMarkers(text: string): Marker[] {
  const starts: number[] = [];
  for (let i = text.indexOf(ILLEGIBLE); i !== -1; i = text.indexOf(ILLEGIBLE, i + ILLEGIBLE.length)) starts.push(i);
  return starts.map((start, n) => {
    const end = start + ILLEGIBLE.length;
    const prevEnd = n > 0 ? starts[n - 1] + ILLEGIBLE.length : 0;
    const nextStart = starts[n + 1] ?? text.length;
    return {
      occurrence: n,
      start,
      end,
      before: squash(text.slice(Math.max(prevEnd, start - CONTEXT_CHARS), start)),
      after: squash(text.slice(end, Math.min(nextStart, end + CONTEXT_CHARS))),
    };
  });
}

/**
 * The marker a suggestion was made for, in the page's current text — or null
 * when it can't be told for sure (the transcription changed around it). Tries
 * the same position first, then any marker with the same surroundings (an
 * earlier one was corrected, shifting the count).
 */
export function locateMarker(
  text: string,
  s: { occurrence: number; contextBefore: string; contextAfter: string }
): Marker | null {
  const markers = findMarkers(text);
  // A neighbour corrected since then widens the context (it stopped at that
  // marker), so the stored one only has to be its end/start.
  const matches = (m: Marker) => m.before.endsWith(s.contextBefore) && m.after.startsWith(s.contextAfter);
  const same = markers[s.occurrence];
  if (same && matches(same)) return same;
  const moved = markers.filter(matches);
  return moved.length === 1 ? moved[0] : null;
}

export function applyReading(text: string, marker: Marker, reading: string): string {
  return text.slice(0, marker.start) + reading + text.slice(marker.end);
}

/**
 * Cleans a visitor's reading; returns an error message when it can't be
 * used. One line, no transcription markup (headings, markers) — it replaces
 * a few words, not a paragraph.
 */
export function validateReading(raw: string): { reading: string } | { error: string } {
  const reading = squash(raw);
  if (!reading) return { error: "Escreva o que você lê no trecho." };
  if (reading.length > 200) return { error: "Texto muito longo (máximo 200 caracteres)." };
  if (/[[\]#]/.test(reading)) return { error: "Escreva só as palavras, sem colchetes ou #." };
  return { reading };
}
