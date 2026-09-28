/**
 * Joins the printed column's line breaks back into flowing paragraphs.
 * The AI sometimes copies the newspaper's narrow columns line by line
 * ("Xando-\nca Alzamora, acompanhada de\nseus filhos"); this turns that into
 * "Xandoca Alzamora, acompanhada de seus filhos" while keeping the breaks
 * that mean something: list items ("— no dia 12…"), ALL-CAPS ad lines,
 * headings and lines that end a sentence.
 *
 * Pure and idempotent — used when saving, indexing and displaying, so texts
 * transcribed before this existed are fixed too.
 */

const LOWER = "a-zà-ÿ";
/** Abbreviations that end in "." but don't end the sentence ("o dr.\nPortes Gil"). */
const ABBREV = /\b(dr|drs|sr|srs|sra|snr|snra|snrta|srta|d|dna|exmo|exma|prof|profa|cap|cel|maj|ten|gal|pe|revmo|mons|ilmo|ilma|v|s|n|pag|pags)\.$/i;
const LIST_START = /^\s*([—–•*]|-\s|\d+[.)]\s)/;

function shouldJoin(prev: string, next: string): "hyphen" | "space" | null {
  const a = prev.trimEnd();
  const b = next.trimStart();
  if (!a || !b || LIST_START.test(b) || b.startsWith("###")) return null;
  // "abasteci-\nmento" → "abastecimento"
  if (new RegExp(`[${LOWER}]-$`, "i").test(a) && new RegExp(`^[${LOWER}]`).test(b)) return "hyphen";
  // Line ends mid-sentence (lowercase word or a comma) → same paragraph.
  if (new RegExp(`[${LOWER},]$`).test(a) || ABBREV.test(a)) return "space";
  // Next line starts lowercase → continuation, unless the previous one closed a sentence.
  if (new RegExp(`^[${LOWER}]`).test(b) && !/[.!?:;]$/.test(a)) return "space";
  return null;
}

export function reflowText(text: string): string {
  const out: string[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const last = out.length - 1;
    const join = last >= 0 && line ? shouldJoin(out[last], line) : null;
    if (join === "hyphen") out[last] = out[last].trimEnd().slice(0, -1) + line.trimStart();
    else if (join === "space") out[last] = out[last].trimEnd() + " " + line.trimStart();
    else out.push(line);
  }
  return out.join("\n");
}
