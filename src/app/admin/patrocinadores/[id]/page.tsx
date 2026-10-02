import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import SponsorRow from "../SponsorRow";

export const dynamic = "force-dynamic";

export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banner = await prisma.sponsor.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!banner) notFound();

  return (
    <AdminEditPage title={`Editar banner: ${banner.name}`} backHref="/admin/patrocinadores">
      <SponsorRow banner={banner} editing />
    </AdminEditPage>
  );
}
