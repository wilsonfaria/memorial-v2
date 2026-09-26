import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedAlbums } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const albums = await getPublishedAlbums();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Galeria" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Galeria</h1>
        <p className="mb-6 text-sm text-slate-500">Álbuns de fotos do acervo e da história do jornal.</p>

        {albums.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum álbum publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {albums.map((a) => {
              const cover = a.coverImageUrl ?? a.photos[0]?.url ?? null;
              return (
                <Link
                  key={a.id}
                  href={`/galeria/${a.slug}`}
                  className="flex flex-col overflow-hidden rounded-xl border border-paper-200 bg-white hover:border-brand-300"
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full bg-brand-100" />
                  )}
                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-brand-900">{a.title}</h2>
                    <p className="text-xs text-slate-400">
                      {a.photos.length} foto{a.photos.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
