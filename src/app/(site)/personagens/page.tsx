import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedCharacters } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const characters = await getPublishedCharacters();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Personagens" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Personagens</h1>
        <p className="mb-6 text-sm text-slate-500">Pessoas que marcaram a história do jornal e da região.</p>

        {characters.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum personagem publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {characters.map((c) => (
              <Link
                key={c.id}
                href={`/personagens/${c.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-paper-200 bg-white p-4 text-center hover:border-brand-300"
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-brand-100" />
                )}
                <p className="text-sm font-semibold text-brand-900">{c.name}</p>
                {c.role && <p className="text-xs text-slate-400">{c.role}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
