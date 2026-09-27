// Regenerates missing edition cover thumbnails from the PDFs already on disk,
// using the same renderer as uploads (src/lib/thumbnail.ts). Useful after
// restoring PDFs from a backup that didn't include the thumbnails.
//
//   npx tsx scripts/regenerate-thumbnails.ts          # only missing ones
//   npx tsx scripts/regenerate-thumbnails.ts --all    # rebuild every thumbnail
//
// Reads DATABASE_URL, PDF_STORAGE_ROOT and UPLOADS_STORAGE_ROOT like the app.
import "dotenv/config";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateEditionThumbnail } from "../src/lib/thumbnail";
import { STORAGE_ROOT } from "../src/lib/storage";
import { UPLOADS_ROOT } from "../src/lib/uploads-root";

const CONCURRENCY = 2;
const rebuildAll = process.argv.includes("--all");

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL as string) });

async function exists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const editions = await prisma.edition.findMany({
    where: { deletedAt: null },
    select: { id: true, pdfPath: true, thumbnailPath: true },
    orderBy: { id: "asc" },
  });

  const todo = [];
  for (const e of editions) {
    const expected = `thumbnails/edicao-${e.id}.jpg`;
    if (rebuildAll || !(await exists(path.join(UPLOADS_ROOT, e.thumbnailPath ?? expected)))) todo.push(e);
  }
  console.log(`${editions.length} edições · ${todo.length} miniaturas a gerar → ${path.join(UPLOADS_ROOT, "thumbnails")}`);

  let done = 0;
  const failed: number[] = [];
  const queue = [...todo];
  async function worker() {
    for (let e = queue.shift(); e; e = queue.shift()) {
      try {
        const pdf = await readFile(path.join(STORAGE_ROOT, e.pdfPath));
        const rel = await generateEditionThumbnail(e.id, pdf);
        if (!rel) throw new Error("render falhou");
        if (rel !== e.thumbnailPath) await prisma.edition.update({ where: { id: e.id }, data: { thumbnailPath: rel } });
      } catch (err) {
        failed.push(e.id);
        console.error(`edição ${e.id} (${e.pdfPath}):`, (err as Error).message);
      }
      done++;
      if (done % 50 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(failed.length ? `Concluído com ${failed.length} falha(s): ${failed.join(", ")}` : "Concluído sem falhas.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
