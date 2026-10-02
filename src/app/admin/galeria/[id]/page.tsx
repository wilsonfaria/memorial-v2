import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import AlbumRow from "../AlbumRow";

export const dynamic = "force-dynamic";

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await prisma.galleryAlbum.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { photos: { orderBy: { order: "asc" } } },
  });
  if (!album) notFound();

  return (
    <AdminEditPage title={`Editar álbum: ${album.title}`} backHref="/admin/galeria">
      <AlbumRow album={album} editing />
    </AdminEditPage>
  );
}
