const MONTH_NAMES_NORMALIZED = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(s: string) {
  return s.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();
}

export function parseYearFromFolderName(name: string): number | null {
  const m = name.match(/(19|20)\d{2}/);
  if (!m) return null;
  return Number(m[0]);
}

export function parseMonthFromFolderName(name: string): number | null {
  const leadingNum = name.match(/^0?(\d{1,2})\b/);
  if (leadingNum) {
    const n = Number(leadingNum[1]);
    if (n >= 1 && n <= 12) return n;
  }
  const norm = normalize(name);
  const idx = MONTH_NAMES_NORMALIZED.findIndex((m) => norm.includes(m));
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Filenames commonly embed a full date (e.g. "1928-11-04_Ed.343.pdf"). Returns
 * that date if found, so the edition's publishedAt can be exact instead of
 * defaulting to the 1st of the month/year folder.
 */
export function parseDateFromFileName(name: string): Date | null {
  let m = name.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    const year = Number(y);
    const month = Number(mo);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  m = name.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = Number(y);
    const month = Number(mo);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  return null;
}

/**
 * Extracts the edition number from a filename such as "1928-11-04_Ed.343.pdf".
 * A date is often embedded in the same filename, so a bare "first number
 * found" approach would wrongly pick up the year (1928) instead of the real
 * edition number (343). Strategy:
 *   1. Prefer a number right after an "Ed"/"Edição" marker.
 *   2. Otherwise, strip any embedded date-like sequences first, then take
 *      the first remaining number.
 */
export function parseEditionNumberFromFileName(name: string): number | null {
  const marked = name.match(/edi[cç][aã]o|ed[ieçã]?/i);
  if (marked) {
    const afterMarker = name.slice(marked.index! + marked[0].length);
    const numAfter = afterMarker.match(/\d+/);
    if (numAfter) return Number(numAfter[0]);
  }

  const withoutDates = name
    .replace(/\d{4}[-_.]\d{2}[-_.]\d{2}/g, "")
    .replace(/\d{2}[-_.]\d{2}[-_.]\d{4}/g, "");
  const m = withoutDates.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export type ParsedUploadFile = {
  file: File;
  relativePath: string;
  year: number;
  month: number;
  editionNumber: number | null;
  publishedAt: Date;
  title: string;
};

export type ParseError = { relativePath: string; reason: string };

export function parseFolderSelection(files: File[]): {
  parsed: ParsedUploadFile[];
  errors: ParseError[];
} {
  const parsed: ParsedUploadFile[] = [];
  const errors: ParseError[] = [];

  for (const file of files) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      continue; // silently skip non-PDF files (e.g. .DS_Store)
    }

    const segments = relativePath.split("/").filter(Boolean);
    const dirSegments = segments.slice(0, -1);

    if (dirSegments.length < 2) {
      errors.push({
        relativePath,
        reason: "Estrutura de pastas insuficiente (esperado .../Ano/Mês/arquivo.pdf).",
      });
      continue;
    }

    const monthFolder = dirSegments[dirSegments.length - 1];
    const yearFolder = dirSegments[dirSegments.length - 2];

    const year = parseYearFromFolderName(yearFolder);
    const month = parseMonthFromFolderName(monthFolder);

    if (!year) {
      errors.push({ relativePath, reason: `Não foi possível identificar o ano na pasta "${yearFolder}".` });
      continue;
    }
    if (!month) {
      errors.push({ relativePath, reason: `Não foi possível identificar o mês na pasta "${monthFolder}".` });
      continue;
    }

    const editionNumber = parseEditionNumberFromFileName(file.name);
    const publishedAt = parseDateFromFileName(file.name) ?? new Date(Date.UTC(year, month - 1, 1));
    const title = editionNumber
      ? `Edição nº ${editionNumber}`
      : file.name.replace(/\.pdf$/i, "");

    parsed.push({ file, relativePath, year, month, editionNumber, publishedAt, title });
  }

  return { parsed, errors };
}
