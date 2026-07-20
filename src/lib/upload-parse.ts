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

export function parseEditionNumberFromFileName(name: string): number | null {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export type ParsedUploadFile = {
  file: File;
  relativePath: string;
  year: number;
  month: number;
  editionNumber: number | null;
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
    const title = editionNumber
      ? `Edição nº ${editionNumber}`
      : file.name.replace(/\.pdf$/i, "");

    parsed.push({ file, relativePath, year, month, editionNumber, title });
  }

  return { parsed, errors };
}
