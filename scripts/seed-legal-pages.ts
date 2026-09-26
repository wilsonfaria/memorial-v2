import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pages = [
    {
      slug: "termos-de-uso",
      title: "Termos de Uso",
      body: `
        <p>Este acervo digital é disponibilizado para consulta pública, educacional e de pesquisa.</p>
        <p>Substitua este texto pelos termos de uso reais do seu portal (regras de uso do conteúdo, direitos autorais das edições, responsabilidades, etc).</p>
      `.trim(),
    },
    {
      slug: "politica-de-privacidade",
      title: "Política de Privacidade",
      body: `
        <p>Este site coleta apenas dados de acesso agregados (número de visitas, downloads) para fins estatísticos internos, sem identificar visitantes individualmente.</p>
        <p>Substitua este texto pela política de privacidade real do seu portal.</p>
      `.trim(),
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        body: p.body,
        published: true,
        showInMenu: false,
      },
    });
  }

  console.log("seeded legal pages:", pages.map((p) => p.slug).join(", "));
}

main().finally(() => prisma.$disconnect());
