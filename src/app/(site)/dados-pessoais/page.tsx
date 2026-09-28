import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { KIND_LABEL, PRIVATE_KINDS } from "@/lib/entities/kinds";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dados pessoais no acervo",
  description:
    "Como o Memorial trata os nomes de pessoas citadas no jornal Alto São Francisco, e como pedir correção ou retirada de uma ficha.",
};

const sensitive = PRIVATE_KINDS.map((k) => KIND_LABEL[k].toLowerCase());
const sensitiveList = `${sensitive.slice(0, -1).join(", ")} e ${sensitive.at(-1)}`;

/** Privacy notice for the AI-built people/places pages (LGPD). */
export default function PersonalDataPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Dados pessoais no acervo" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <article className="max-w-prose text-sm leading-relaxed text-slate-600 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-brand-900 [&_p]:mb-3">
          <h1 className="mb-4 text-2xl font-semibold text-brand-900">Dados pessoais no acervo</h1>
          <p>
            O jornal <em>Alto São Francisco</em> noticiou por décadas a vida de Piumhi e região: nascimentos, casamentos,
            viagens, festas, falecimentos. Por isso as suas páginas estão cheias de nomes de pessoas. Esta página
            explica o que o Memorial faz com esses nomes nas fichas de{" "}
            <Link href="/pessoas" className="text-brand-700 underline">
              pessoas
            </Link>{" "}
            e{" "}
            <Link href="/lugares" className="text-brand-700 underline">
              lugares
            </Link>
            , e como pedir que uma ficha seja corrigida ou retirada.
          </p>

          <h2>Para que servem as fichas</h2>
          <p>
            A finalidade é a preservação da memória histórica de Piumhi e região e o acesso público a ela: ajudar
            famílias, pesquisadores e estudantes a encontrar em que edições alguém ou algum lugar foi citado. As fichas
            são só um índice; o que vale é sempre o jornal original, que continua disponível na íntegra e sem alterações.
          </p>

          <h2>Base legal</h2>
          <p>
            Os nomes vêm de um jornal publicado e que circulou publicamente. A Lei Geral de Proteção de Dados (Lei
            13.709/2018, art. 7º, § 3º) permite tratar dados de acesso público considerando a finalidade, a boa-fé e o
            interesse público que justificaram a sua divulgação — aqui, o registro histórico da cidade. O índice também
            se apoia no legítimo interesse (art. 7º, IX) de organizar e dar acesso a esse acervo, sempre com as
            salvaguardas descritas abaixo.
          </p>

          <h2>As fichas são feitas por inteligência artificial</h2>
          <p>
            Uma IA lê a transcrição de cada página e anota as matérias, as pessoas e os lugares citados. Ela pode errar:
            juntar pessoas diferentes que têm o mesmo nome, separar a mesma pessoa citada de formas diferentes, ler mal
            um nome ou resumir mal uma notícia. Confira sempre no jornal original antes de tirar conclusões.
          </p>

          <h2>O que fica de fora</h2>
          <p>
            Matérias sobre {sensitiveList} não entram nas fichas: não aparecem na linha do tempo de ninguém, não contam
            nas menções nem no “aparece junto com”. Elas continuam no jornal, como foram publicadas, mas não são
            reunidas por nome. As fichas de pessoas também não são oferecidas aos buscadores (Google e outros) para
            indexação.
          </p>

          <h2>Correção ou retirada (LGPD, art. 18)</h2>
          <p>
            Se você é a pessoa citada, ou familiar de alguém já falecido, pode pedir que uma ficha seja corrigida ou
            retirada, ou se opor a ela. Escreva pelo{" "}
            <Link href="/fale-conosco" className="text-brand-700 underline">
              Fale Conosco
            </Link>{" "}
            com o assunto “Dados pessoais”, informando o endereço da ficha (por exemplo,{" "}
            <code className="text-xs">/pessoas/jose-mota</code>) e o que deseja. Uma ficha retirada deixa de ser
            exibida e o nome deixa de aparecer nas fichas de outras pessoas; o jornal original não é alterado, por ser
            documento histórico.
          </p>
        </article>
      </div>
    </>
  );
}
