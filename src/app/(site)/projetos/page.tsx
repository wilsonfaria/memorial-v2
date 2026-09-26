import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Projetos" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Projetos</h1>
        <p className="mb-6 text-sm text-slate-500">Iniciativas por trás do memorial digital.</p>

        {projects.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum projeto publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.slug}`}
                className="flex flex-col overflow-hidden rounded-xl border border-paper-200 bg-white hover:border-brand-300"
              >
                {p.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImageUrl} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-4">
                  <h2 className="text-sm font-semibold text-brand-900">{p.title}</h2>
                  {p.summary && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
