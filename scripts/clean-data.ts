import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.newspaper.deleteMany({});
  console.log("Registros removidos (cascata: decadas/anos/meses/edicoes).");

  const storageRoot = path.join(process.cwd(), "storage", "pdfs");
  await rm(storageRoot, { recursive: true, force: true });
  await mkdir(storageRoot, { recursive: true });
  console.log("Arquivos PDF removidos de storage/pdfs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
