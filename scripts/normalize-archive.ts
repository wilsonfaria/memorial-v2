/**
 * Normaliza o acervo bruto de digitalização (uma pasta por edição, uma
 * página por PDF, com 4 esqueletos de nome diferentes conforme a década)
 * para o formato que o portal espera: `.../Ano/Mês/AAAA-MM-DD_Ed.NNN.pdf`,
 * um único PDF por edição.
 *
 * Uso:
 *   npx tsx scripts/normalize-archive.ts [--source "C:\Edições\Arrumar"] [--out "C:\Edições\Prontas"] [--dry-run] [--force]
 *
 * Não apaga nem modifica nada em --source; só lê. Idempotente: pula edições
 * cujo PDF de saída já existe, a menos que --force seja passado.
 */
import { PDFDocument } from "pdf-lib";
import { readdir, readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
function argValue(flag: string, fallback: string) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const SOURCE_ROOT = argValue("--source", "C:\\Edições\\Arrumar");
const OUTPUT_ROOT = argValue("--out", "C:\\Edições\\Prontas");
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

type ParsedEdition = {
  year: number;
  month: number;
  day: number;
  editionNumber: number;
  isSupplementNumber: boolean; // "Ed_N2".."Ed_N16" (1945) — não é o número real da edição
};

function parseEditionFolder(name: string): ParsedEdition | null {
  const dateMatch = name.match(/(\d{4})\D{0,2}(\d{2})[-_](\d{2})/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const edMatch = name.match(/edi[cç][aã]o|ed[i]?[cç]?[aã]?o?[\s_.,-]*([nN])?(\d+)/i);
  if (!edMatch || !edMatch[2]) return null;

  return {
    year,
    month,
    day,
    editionNumber: Number(edMatch[2]),
    isSupplementNumber: Boolean(edMatch[1]),
  };
}

function pageNumber(fileName: string): number {
  const m = fileName.match(/pg[_\s]?(\d+)/i);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

function embeddedYear(fileName: string): number | null {
  const m = fileName.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

async function mergePdfs(
  dir: string,
  pageFiles: string[]
): Promise<{ bytes: Uint8Array; failedPages: string[] }> {
  const merged = await PDFDocument.create();
  const failedPages: string[] = [];
  for (const file of pageFiles) {
    try {
      const bytes = await readFile(path.join(dir, file));
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    } catch {
      failedPages.push(file);
    }
  }
  return { bytes: await merged.save(), failedPages };
}

type Anomaly = { path: string; reason: string };

const REVIEW_ROOT = path.join(OUTPUT_ROOT, "_revisao-manual");

async function copyToReview(editionPath: string, relSource: string) {
  if (DRY_RUN) return;
  await cp(editionPath, path.join(REVIEW_ROOT, relSource), { recursive: true });
}

async function main() {
  const anomalies: Anomaly[] = [];
  let mergedCount = 0;
  let skippedExisting = 0;

  const yearDirs = (await readdir(SOURCE_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const yearDir of yearDirs) {
    const yearDirPath = path.join(SOURCE_ROOT, yearDir);
    const editionDirs = (await readdir(yearDirPath, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const editionDir of editionDirs) {
      const editionPath = path.join(yearDirPath, editionDir);
      const relSource = path.join(yearDir, editionDir);
      const parsed = parseEditionFolder(editionDir);

      if (!parsed) {
        anomalies.push({ path: relSource, reason: "Não foi possível extrair data e/ou número de edição do nome da pasta." });
        await copyToReview(editionPath, relSource);
        continue;
      }
      if (parsed.isSupplementNumber) {
        anomalies.push({ path: relSource, reason: `Número marcado com "N" (${parsed.editionNumber}) parece ser contagem de suplemento, não o número real da edição — revisar manualmente.` });
        await copyToReview(editionPath, relSource);
        continue;
      }

      const pageFiles = (await readdir(editionPath, { withFileTypes: true }))
        .filter((f) => f.isFile() && f.name.toLowerCase().endsWith(".pdf"))
        .map((f) => f.name)
        .sort((a, b) => pageNumber(a) - pageNumber(b));

      if (pageFiles.length === 0) {
        anomalies.push({ path: relSource, reason: "Pasta de edição sem nenhum PDF de página dentro." });
        await copyToReview(editionPath, relSource);
        continue;
      }

      const mismatched = pageFiles.filter((f) => {
        const y = embeddedYear(f);
        return y !== null && y !== parsed.year;
      });
      if (mismatched.length > 0) {
        anomalies.push({
          path: relSource,
          reason: `Ano da pasta é ${parsed.year}, mas ${mismatched.length} arquivo(s) de página citam outro ano no nome (ex.: "${mismatched[0]}") — conferir se a data está certa antes de confiar no PDF final. PDF foi mesclado mesmo assim (cópia da pasta original também colocada em revisão para conferência).`,
        });
        await copyToReview(editionPath, relSource);
      }

      const monthPadded = String(parsed.month).padStart(2, "0");
      const dayPadded = String(parsed.day).padStart(2, "0");
      const outDir = path.join(OUTPUT_ROOT, String(parsed.year), monthPadded);
      const outFile = `${parsed.year}-${monthPadded}-${dayPadded}_Ed.${parsed.editionNumber}.pdf`;
      const outPath = path.join(outDir, outFile);

      if (!FORCE) {
        try {
          await readFile(outPath);
          skippedExisting++;
          continue;
        } catch {
          // não existe ainda — segue para gerar
        }
      }

      if (DRY_RUN) {
        console.log(`[dry-run] ${relSource} (${pageFiles.length} págs) -> ${path.join(String(parsed.year), monthPadded, outFile)}`);
        mergedCount++;
        continue;
      }

      const { bytes: mergedBytes, failedPages } = await mergePdfs(editionPath, pageFiles);

      if (failedPages.length === pageFiles.length) {
        const reason = `Todas as ${pageFiles.length} página(s) estão corrompidas/vazias — nada para mesclar.`;
        anomalies.push({ path: relSource, reason });
        await copyToReview(editionPath, relSource);
        console.log(`FALHA ${relSource}\n  -> ${reason}`);
        continue;
      }

      const finalOutFile = failedPages.length > 0
        ? outFile.replace(/\.pdf$/i, "_INCOMPLETO.pdf")
        : outFile;
      const finalOutPath = path.join(outDir, finalOutFile);

      if (failedPages.length > 0) {
        const reason = `${failedPages.length} de ${pageFiles.length} página(s) corrompida(s)/vazia(s) (${failedPages.join(", ")}) — PDF gerado mesmo assim com as páginas restantes, mas marcado "_INCOMPLETO" no nome; falta(m) página(s) para rescanear.`;
        anomalies.push({ path: relSource, reason });
        await copyToReview(editionPath, relSource);
        console.log(`PARCIAL ${relSource}\n  -> ${reason}`);
      }

      await mkdir(outDir, { recursive: true });
      await writeFile(finalOutPath, mergedBytes);
      mergedCount++;
      console.log(`OK  ${relSource} (${pageFiles.length} págs) -> ${path.join(String(parsed.year), monthPadded, finalOutFile)}`);
    }
  }

  console.log(`\n${DRY_RUN ? "[dry-run] " : ""}Concluído.`);
  console.log(`  Edições ${DRY_RUN ? "a mesclar" : "mescladas"}: ${mergedCount}`);
  console.log(`  Já existentes (puladas): ${skippedExisting}`);
  console.log(`  Anomalias para revisão manual: ${anomalies.length}`);

  if (anomalies.length > 0) {
    console.log("\n--- Anomalias ---");
    for (const a of anomalies) console.log(`  ${a.path}\n    -> ${a.reason}`);

    if (!DRY_RUN) {
      const reportLines = anomalies.map((a) => `${a.path}\n  -> ${a.reason}\n`);
      await mkdir(REVIEW_ROOT, { recursive: true });
      await writeFile(
        path.join(REVIEW_ROOT, "LEIA-ME.txt"),
        `Pastas copiadas aqui precisam de revisão manual antes de virarem edições no portal.\n` +
          `Cada subpasta abaixo é uma cópia intacta da pasta original em ${SOURCE_ROOT} (nada foi apagado na origem).\n\n` +
          reportLines.join("\n"),
        "utf-8"
      );
      console.log(`\nCópias + relatório em: ${REVIEW_ROOT}\\LEIA-ME.txt`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
