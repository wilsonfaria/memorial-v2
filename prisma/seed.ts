import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

const STORAGE_ROOT = path.join(process.cwd(), "storage", "pdfs");
const NEWSPAPER_SLUG = "alto-sao-francisco";
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

async function makePlaceholderPdf(title: string, subtitle: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait in points
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: rgb(0.16, 0.32, 0.55) });
  page.drawText("Jornal do Alto São Francisco", {
    x: 40, y: 810, size: 20, font, color: rgb(1, 1, 1),
  });
  page.drawText(title, { x: 40, y: 700, size: 28, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(subtitle, { x: 40, y: 660, size: 14, font: bodyFont, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(
    "Edição digitalizada de exemplo (placeholder). Substitua pelo PDF real do acervo.",
    { x: 40, y: 600, size: 11, font: bodyFont, color: rgb(0.45, 0.45, 0.45) }
  );
  page.drawLine({
    start: { x: 40, y: 590 }, end: { x: 555, y: 590 },
    thickness: 1, color: rgb(0.8, 0.8, 0.85),
  });

  return doc.save();
}

async function main() {
  console.log("Seeding database...");

  const newspaper = await prisma.newspaper.upsert({
    where: { slug: NEWSPAPER_SLUG },
    update: {},
    create: {
      name: "Jornal do Alto São Francisco",
      slug: NEWSPAPER_SLUG,
      logoUrl: "/logo.svg",
    },
  });

  let editionCounter = 0;

  // Decades with a light footprint (2000s, 2010s): one edition per year, January only.
  for (const startYear of [2000, 2010]) {
    const decade = await prisma.decade.upsert({
      where: { newspaperId_startYear: { newspaperId: newspaper.id, startYear } },
      update: {},
      create: { newspaperId: newspaper.id, startYear, label: `${startYear}s` },
    });

    for (let y = startYear; y < startYear + 10; y++) {
      const year = await prisma.year.upsert({
        where: { decadeId_year: { decadeId: decade.id, year: y } },
        update: {},
        create: { decadeId: decade.id, year: y },
      });
      const month = await prisma.month.upsert({
        where: { yearId_month: { yearId: year.id, month: 1 } },
        update: {},
        create: { yearId: year.id, month: 1 },
      });

      editionCounter += 1;
      const publishedAt = new Date(Date.UTC(y, 0, 8));
      const title = `Edição de ${publishedAt.getUTCDate()}/01/${y}`;
      const relDir = path.join(String(y), "01");
      const fileName = `edicao-${editionCounter}.pdf`;
      const absDir = path.join(STORAGE_ROOT, relDir);
      await mkdir(absDir, { recursive: true });
      const bytes = await makePlaceholderPdf(title, `${MONTH_NAMES[0]} de ${y}`);
      await writeFile(path.join(absDir, fileName), bytes);

      await prisma.edition.create({
        data: {
          title,
          editionNumber: editionCounter,
          publishedAt,
          pdfPath: path.join(relDir, fileName).replace(/\\/g, "/"),
          fileSizeBytes: bytes.byteLength,
          pageCount: 1,
          monthId: month.id,
        },
      });
    }
    console.log(`Década ${startYear}s: ok`);
  }

  // 2020s decade: fully populated, 4 editions per month, up to the current month.
  {
    const startYear = 2020;
    const decade = await prisma.decade.upsert({
      where: { newspaperId_startYear: { newspaperId: newspaper.id, startYear } },
      update: {},
      create: { newspaperId: newspaper.id, startYear, label: `${startYear}s` },
    });

    const now = new Date();
    const lastYear = now.getUTCFullYear();
    const lastMonth = now.getUTCMonth() + 1; // 1-12

    for (let y = startYear; y <= lastYear; y++) {
      const year = await prisma.year.upsert({
        where: { decadeId_year: { decadeId: decade.id, year: y } },
        update: {},
        create: { decadeId: decade.id, year: y },
      });

      const monthsInYear = y === lastYear ? lastMonth : 12;
      for (let m = 1; m <= monthsInYear; m++) {
        const month = await prisma.month.upsert({
          where: { yearId_month: { yearId: year.id, month: m } },
          update: {},
          create: { yearId: year.id, month: m },
        });

        for (const day of [1, 8, 15, 22]) {
          editionCounter += 1;
          const publishedAt = new Date(Date.UTC(y, m - 1, day));
          const title = `Edição de ${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
          const relDir = path.join(String(y), String(m).padStart(2, "0"));
          const fileName = `edicao-${editionCounter}.pdf`;
          const absDir = path.join(STORAGE_ROOT, relDir);
          await mkdir(absDir, { recursive: true });
          const bytes = await makePlaceholderPdf(title, `${MONTH_NAMES[m - 1]} de ${y}`);
          await writeFile(path.join(absDir, fileName), bytes);

          await prisma.edition.create({
            data: {
              title,
              editionNumber: editionCounter,
              publishedAt,
              pdfPath: path.join(relDir, fileName).replace(/\\/g, "/"),
              fileSizeBytes: bytes.byteLength,
              pageCount: 1,
              monthId: month.id,
            },
          });
        }
      }
      console.log(`Ano ${y}: ok`);
    }
  }

  console.log(`Seed concluído. ${editionCounter} edições criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
