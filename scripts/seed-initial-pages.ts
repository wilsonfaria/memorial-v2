import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb("mysql://root:memorial_root_pw@localhost:3310/memorial");
const prisma = new PrismaClient({ adapter });

async function main() {
  const pages = [
    {
      slug: "seja-um-apoiador",
      title: "Seja um apoiador",
      menuOrder: 1,
      body: `
        <p>Este acervo digital é mantido graças ao apoio de leitores e empresas que acreditam na importância de preservar a memória do Jornal Alto São Francisco.</p>
        <h2>Como apoiar</h2>
        <p>Se você deseja contribuir financeiramente para a manutenção e ampliação deste acervo, entre em contato conosco pelos canais abaixo ou faça uma doação diretamente:</p>
        <ul>
          <li><strong>Chave PIX:</strong> substituir-pela-chave-pix@exemplo.com</li>
          <li><strong>Banco:</strong> substituir pelo nome do banco, agência e conta</li>
        </ul>
        <p>Empresas interessadas em se tornar apoiadoras institucionais (com logo exibida no site) podem entrar em contato pela página de Contato.</p>
      `.trim(),
    },
    {
      slug: "contato",
      title: "Contato",
      menuOrder: 2,
      body: `
        <p>Tem dúvidas, sugestões ou quer contribuir com o acervo? Fale com a gente:</p>
        <ul>
          <li><strong>Email:</strong> substituir@exemplo.com</li>
          <li><strong>Telefone/WhatsApp:</strong> (00) 00000-0000</li>
          <li><strong>Endereço:</strong> substituir pelo endereço, se houver sede física</li>
        </ul>
      `.trim(),
    },
    {
      slug: "historia-do-jornal",
      title: "História do Jornal",
      menuOrder: 3,
      body: `
        <p>O Jornal Alto São Francisco nasceu do desejo de registrar e compartilhar os acontecimentos, as vozes e a cultura da região do Alto São Francisco.</p>
        <h2>As primeiras edições</h2>
        <p>Substitua este texto pela história real do jornal: quando foi fundado, por quem, e como evoluiu ao longo das décadas.</p>
        <h2>O acervo digital</h2>
        <p>Este memorial digital nasceu do esforço de preservar e tornar acessível ao público todo o histórico de edições impressas, permitindo que pesquisadores, ex-leitores e curiosos revisitem décadas de história local.</p>
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
        menuOrder: p.menuOrder,
        published: true,
        showInMenu: true,
      },
    });
  }

  console.log("seeded pages:", pages.map((p) => p.slug).join(", "));
}

main().finally(() => prisma.$disconnect());
