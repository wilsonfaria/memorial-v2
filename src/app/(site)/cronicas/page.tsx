import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedChronicles } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ChroniclesPage() {
  const chronicles = await getPublishedChronicles();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Crônicas" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Crônicas</h1>
        <p className="mb-6 text-sm text-slate-500">Histórias e crônicas do Jornal Alto São Francisco.</p>

        {chronicles.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhuma crônica publicada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {chronicles.map((c) => (
              <Link
                key={c.id}
                href={`/cronicas/${c.slug}`}
                className="flex flex-col overflow-hidden rounded-xl border border-paper-200 bg-white hover:border-brand-300"
              >
                {c.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.coverImageUrl} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h2 className="text-sm font-semibold text-brand-900">{c.title}</h2>
                  {c.excerpt && <p className="line-clamp-3 text-xs text-slate-500">{c.excerpt}</p>}
                  {c.authorName && <p className="mt-auto pt-2 text-[11px] text-slate-400">{c.authorName}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
