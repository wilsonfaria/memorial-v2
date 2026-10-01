import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import ArticleKindRows from "@/components/articles/ArticleKindRows";
import { KIND_LABEL, type ArticleKind } from "@/lib/entities/kinds";
import { listArticlesByKind } from "@/lib/entities/queries";

/** Public listing of every item of one kind (/materias/[kind]), newest first. */
export default async function ArticleKindList({ kind, page }: { kind: string; page: number }) {
  const data = await listArticlesByKind(kind, page);
  if (!data) return null;
  const label = KIND_LABEL[kind as ArticleKind];
  const href = (p: number) => `/materias/${kind}${p > 1 ? `?p=${p}` : ""}`;

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Matérias por tipo", href: "/materias" }, { label }]} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">{label}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {data.total} {data.total === 1 ? "matéria" : "matérias"} deste tipo, da mais recente para a mais antiga.
        </p>

        {data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhuma matéria encontrada.</p>
        ) : (
          <ArticleKindRows items={data.items} />
        )}

        {data.pages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link href={href(page - 1)} className="text-brand-700 hover:underline">
                ← Mais recentes
              </Link>
            )}
            <span className="text-slate-400">
              Página {page} de {data.pages}
            </span>
            {page < data.pages && (
              <Link href={href(page + 1)} className="text-brand-700 hover:underline">
                Mais antigas →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
