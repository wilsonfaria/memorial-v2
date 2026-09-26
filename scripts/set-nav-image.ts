import "dotenv/config";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { HOMEPAGE_UPLOAD_DIR, HOMEPAGE_PUBLIC_PREFIX } from "../src/lib/homepage-storage";

const FIELD_MAP: Record<string, string> = {
  decadas: "navDecadasImageUrl",
  anos: "navAnosImageUrl",
  meses: "navMesesImageUrl",
  dias: "navDiasImageUrl",
  edicoes: "navEdicoesImageUrl",
  cronicas: "navCronicasImageUrl",
};

async function main() {
  const [key, source] = process.argv.slice(2);
  const field = FIELD_MAP[key];
  if (!field || !source) {
    throw new Error(`Usage: tsx scripts/set-nav-image.ts <${Object.keys(FIELD_MAP).join("|")}> <source-file-path>`);
  }

  await mkdir(HOMEPAGE_UPLOAD_DIR, { recursive: true });
  const fileName = `nav-${key}-${Date.now()}.jpg`;
  await copyFile(source, path.join(HOMEPAGE_UPLOAD_DIR, fileName));

  const url = `${HOMEPAGE_PUBLIC_PREFIX}/${fileName}`;
  await prisma.homepageContent.upsert({
    where: { id: 1 },
    update: { [field]: url },
    create: { id: 1, [field]: url },
  });

  console.log(`${field} set to`, url);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
