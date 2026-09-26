import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import GalleryPhotoTile from "@/components/GalleryPhotoTile";
import { getPublishedAlbumBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getPublishedAlbumBySlug(slug);
  if (!album) return {};

  const cover = album.coverImageUrl ?? album.photos[0]?.url;
  const description = album.description || `${album.photos.length} foto${album.photos.length === 1 ? "" : "s"} no acervo.`;
  return {
    title: album.title,
    description,
    openGraph: {
      title: album.title,
      description,
      type: "article",
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await getPublishedAlbumBySlug(slug);
  if (!album) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Galeria", href: "/galeria" },
          { label: album.title },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">{album.title}</h1>
        {album.description && <p className="mb-6 text-sm text-slate-500">{album.description}</p>}

        {album.photos.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Este álbum ainda não tem fotos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5">
            {album.photos.map((photo) => (
              <GalleryPhotoTile key={photo.id} photo={photo} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
