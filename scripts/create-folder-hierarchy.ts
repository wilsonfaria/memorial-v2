import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { STORAGE_ROOT } from "../src/lib/storage";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const years = await prisma.year.findMany({
    include: { months: true },
    orderBy: { year: "asc" },
  });

  let created = 0;
  for (const year of years) {
    const monthNumbers = year.months.length
      ? year.months.map((m) => m.month)
      : Array.from({ length: 12 }, (_, i) => i + 1);

    for (const month of monthNumbers) {
      const relDir = path.join(String(year.year), String(month).padStart(2, "0"));
      await mkdir(path.join(STORAGE_ROOT, relDir), { recursive: true });
      created++;
      console.log(`Criada: ${relDir}`);
    }
  }

  console.log(`\nConcluído. ${created} pastas Ano/Mês garantidas em ${STORAGE_ROOT}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
