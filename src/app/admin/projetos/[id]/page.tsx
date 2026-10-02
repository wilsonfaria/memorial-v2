import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import ProjectRow from "../ProjectRow";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!project) notFound();

  return (
    <AdminEditPage title={`Editar projeto: ${project.title}`} backHref="/admin/projetos">
      <ProjectRow project={project} editing />
    </AdminEditPage>
  );
}
