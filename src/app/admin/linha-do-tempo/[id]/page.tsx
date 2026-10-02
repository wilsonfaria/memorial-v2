import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import MilestoneRow from "../MilestoneRow";

export const dynamic = "force-dynamic";

export default async function EditMilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestone = await prisma.timelineMilestone.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!milestone) notFound();

  return (
    <AdminEditPage title={`Editar marco: ${milestone.title}`} backHref="/admin/linha-do-tempo">
      <MilestoneRow milestone={milestone} editing />
    </AdminEditPage>
  );
}
