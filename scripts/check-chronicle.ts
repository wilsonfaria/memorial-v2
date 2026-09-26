import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

prisma.chronicle.findFirst({ where: { slug: "editor-rico-teste" } }).then((c) => {
  console.log(c?.body);
  return prisma.$disconnect();
});
