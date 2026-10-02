import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import AdminNewLink from "@/components/admin/AdminNewLink";
import AlbumRow from "./AlbumRow";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const [albums, pendingSuggestions] = await Promise.all([
    prisma.galleryAlbum.findMany({
      where: { deletedAt: null },
      orderBy: { order: "asc" },
      include: { photos: { orderBy: { order: "asc" } } },
    }),
    prisma.photoCaptionSuggestion.count({ where: { status: "pending" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Galeria"
        description={
          <>
            Álbuns de fotos exibidos em <code>/galeria</code>. Cada álbum pode ter várias fotos.
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/galeria/sugestoes"
              className="flex items-center gap-1.5 rounded-lg border border-paper-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300"
            >
              <MessageCircle size={13} />
              Sugestões de identificação
              {pendingSuggestions > 0 && (
                <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {pendingSuggestions}
                </span>
              )}
            </Link>
            <AdminNewLink href="/admin/galeria/novo" label="Novo álbum" />
          </div>
        }
      />

      <div className="flex flex-col gap-1">
        {albums.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum álbum cadastrado ainda.</p>
        )}
        {albums.map((a) => (
          <AlbumRow key={a.id} album={a} />
        ))}
      </div>
    </>
  );
}
