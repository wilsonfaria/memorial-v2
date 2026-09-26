import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import EnrollMfaCard from "./EnrollMfaCard";
import MfaManageCard from "./MfaManageCard";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user) redirect("/admin/login");

  return (
    <>
      <PageHeader
        title="Segurança"
        description={`Configurações de segurança da sua própria conta (${user.email}).`}
      />

      <Card
        title="Verificação em duas etapas (MFA)"
        description="Exige um código do seu aplicativo autenticador além da senha no login."
        className="max-w-2xl"
      >
        {user.mfaEnabled ? <MfaManageCard /> : <EnrollMfaCard />}
      </Card>
    </>
  );
}
