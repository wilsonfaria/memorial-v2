import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import PageRow from "../PageRow";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!page) notFound();

  return (
    <AdminEditPage title={`Editar página: ${page.title}`} backHref="/admin/paginas">
      <PageRow page={page} editing />
    </AdminEditPage>
  );
}
