/**
 * Masks the names of hidden people/places in other entities' pages (titles
 * and summaries written by the model). Matching is loose on purpose — any
 * case, with or without accents, "Motta" = "Mota", "Luiz" = "Luis", "y" = "i" —
 * because the summary is in modern Portuguese and may respell the printed name.
 */

export const MASK = "[nome ocultado]";

const LETTER_CLASS: Record<string, string> = {
  a: "aàáâãä",
  e: "eèéêë",
  i: "iìíîïyý",
  y: "iìíîïyý",
  o: "oòóôõö",
  u: "uùúûü",
  c: "cç",
  s: "sz",
  z: "sz",
};
const DOUBLING = new Set("bcdfglmnprstvz");

const escape = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/** One name → a loose pattern (no flags); everything that isn't a letter is escaped literally. */
export function namePattern(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  let out = "";
  for (let i = 0; i < base.length; i++) {
    const ch = base[i];
    if (/\s/.test(ch)) {
      while (/\s/.test(base[i + 1] ?? "")) i++;
      out += "\\s+";
      continue;
    }
    if (!/[a-z]/.test(ch)) {
      out += escape(ch);
      continue;
    }
    const next = base[i + 1];
    // The old spellings folded by normalize.ts: "Baptista", "Victor", "Raphael", "Athayde".
    if ((ch === "p" || ch === "c") && next === "t") {
      out += ch === "c" ? "[cç]?" : "p?";
      continue;
    }
    if ((ch === "p" && next === "h") || ch === "f") {
      if (ch === "p") i++;
      out += "(?:ph|f{1,2})";
      continue;
    }
    if (ch === "t" && next === "h") i++;
    // "tt" and "t" both become t{1,2}, so old and new spellings meet.
    while (DOUBLING.has(ch) && base[i + 1] === ch) i++;
    if (ch === "t") {
      out += "t{1,2}h?";
      continue;
    }
    const cls = LETTER_CLASS[ch] ? `[${LETTER_CLASS[ch]}]` : ch;
    out += DOUBLING.has(ch) ? `${cls}{1,2}` : cls;
  }
  return out;
}

/** Builds a masker for a set of names; with none, returns the text unchanged. */
export function nameMasker(names: Iterable<string>): (text: string) => string {
  const patterns = [...new Set([...names].map((n) => n.trim()).filter((n) => n.length >= 3))]
    .sort((a, b) => b.length - a.length) // "José Motta Filho" before "José Motta"
    .map(namePattern);
  if (patterns.length === 0) return (text) => text;
  // Whole words only: "Ana" must not eat "Anapolis" or "Mariana".
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${patterns.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return (text) => text.replace(re, MASK);
}
