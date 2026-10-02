import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import AdminEditPage from "@/components/admin/AdminEditPage";
import UserRow from "../UserRow";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, user, userCount] = await Promise.all([
    getSession(),
    prisma.adminUser.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, username: true, email: true },
    }),
    prisma.adminUser.count(),
  ]);
  if (!user) notFound();
  const isSelf = user.id === Number(session?.sub);

  return (
    <AdminEditPage title={`Editar usuário: ${user.name}`} backHref="/admin/usuarios">
      <UserRow user={user} isSelf={isSelf} canDelete={!isSelf && userCount > 1} editing />
    </AdminEditPage>
  );
}
