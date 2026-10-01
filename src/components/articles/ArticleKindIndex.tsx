import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { KIND_LABEL } from "@/lib/entities/kinds";
import { listKindCounts } from "@/lib/entities/queries";

/** Public index of /materias: every newspaper item type that has at least one item, with its count. */
export default async function ArticleKindIndex() {
  const kinds = await listKindCounts();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Matérias por tipo" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Matérias por tipo</h1>
        <p className="mb-6 max-w-prose text-sm leading-relaxed text-slate-500">
          Toda matéria já identificada nas páginas transcritas, agrupada por tipo — notícias, nascimentos, anúncios,
          crônicas e mais. Classificação gerada automaticamente por IA a partir da transcrição — pode conter erros.
          Matérias sobre saúde, polícia, religião e política ficam fora.
        </p>

        {kinds.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhuma matéria classificada ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kinds.map((k) => (
              <li key={k.kind}>
                <Link
                  href={`/materias/${k.kind}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-paper-200 bg-white px-3 py-2.5 hover:border-brand-300"
                >
                  <span className="truncate text-sm font-medium text-brand-900">{KIND_LABEL[k.kind]}</span>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700">
                    {k.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
