/**
 * Grouping keys for people and places across decades of spelling changes.
 * The 1920s paper writes "Piumhy", "Motta", "Baptista", "Bello Horizonte";
 * later issues "Piumhi", "Mota", "Batista", "Belo Horizonte". Folding the
 * old orthography into one key lets every mention of the same name meet.
 *
 * Deliberately conservative: it only folds spelling, never guesses that two
 * different names are the same person ("José Motta" and "cap. Motta" stay
 * apart — joining those needs a person's judgement).
 */

/** Honorifics printed before names; kept separately from the name. */
const HONORIFICS = new Set(
  [
    "sr", "srs", "sra", "sras", "snr", "snra", "snrs", "snrta", "srta", "sta", "d", "dna", "dona", "dr", "drs", "dra",
    "exmo", "exma", "illmo", "illma", "ilmo", "ilma", "prof", "profa", "professor", "professora", "cap", "capitão",
    "capitao", "cel", "coronel", "maj", "major", "ten", "tenente", "gal", "general", "pe", "padre", "revmo", "rev",
    "mons", "monsenhor", "frei", "irmã", "irma", "sgto", "sargento", "com", "commendador", "comendador", "juiz",
    "pharmaceutico", "farmaceutico", "mme", "mlle", "joven", "jovem", "menina", "menino", "sta.", "s",
  ].map((h) => h.replace(/\.$/, ""))
);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Old → modern orthography, applied to an already lower-cased, accent-free string. */
function foldSpelling(s: string): string {
  return s
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/ch(?=r|l)/g, "c") // "christo", "chloe"
    .replace(/y/g, "i")
    .replace(/([aeiou])h(?=[aeiou])/g, "$1") // "Bambuhy" → "Bambuí" (nh/lh untouched)
    .replace(/mn/g, "n") // "damno"
    .replace(/pt(?=[aeiou])/g, "t") // "Baptista", "baptismo"
    .replace(/ct(?=[aeiou])/g, "t") // "Victor", "directora"
    .replace(/([bcdfglmnprstvz])\1/g, "$1") // "Motta", "Mello", "Bello", "Collegio"
    .replace(/z$/, "s"); // "Luiz" / "Luis"
}

/** Splits a printed name into its honorific (if any) and the bare name. */
export function splitHonorific(printed: string): { honorific: string | null; name: string } {
  const words = printed.trim().split(/\s+/);
  const lead: string[] = [];
  while (words.length > 1 && HONORIFICS.has(stripAccents(words[0].toLowerCase()).replace(/\.$/, ""))) {
    lead.push(words.shift()!);
  }
  return { honorific: lead.length ? lead.join(" ") : null, name: words.join(" ") };
}

/**
 * Grouping key: accent-free, lower-case, old spelling folded. For people the
 * honorific is removed too; places keep theirs ("S. Paulo", "Sta. Rita").
 */
export function entityKey(name: string, kind: "person" | "place" = "person"): string {
  const bare = kind === "person" ? splitHonorific(name).name : name;
  const words = stripAccents(bare.toLowerCase())
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(foldSpelling);
  return words.join(" ").trim();
}

/** URL slug from a key ("jose mota" → "jose-mota"). */
export function slugFromKey(key: string): string {
  return key.replace(/['\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 200) || "sem-nome";
}

const SMALL_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "d'", "del", "la"]);

/** "OLIVEIRA JUNIOR" → "Oliveira Junior"; names already in mixed case are kept as printed. */
export function displayName(printed: string): string {
  const name = printed.trim().replace(/\s+/g, " ");
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** A usable name: at least two letters, not just an honorific or initials. */
export function isUsableName(name: string, kind: "person" | "place" = "person"): boolean {
  const key = entityKey(name, kind);
  return key.replace(/[^a-z]/g, "").length >= 3;
}
