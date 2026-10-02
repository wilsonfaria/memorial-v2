import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import ChronicleRow from "../ChronicleRow";

export const dynamic = "force-dynamic";

export default async function EditChroniclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chronicle = await prisma.chronicle.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!chronicle) notFound();

  return (
    <AdminEditPage title={`Editar crônica: ${chronicle.title}`} backHref="/admin/cronicas">
      <ChronicleRow chronicle={chronicle} editing />
    </AdminEditPage>
  );
}
