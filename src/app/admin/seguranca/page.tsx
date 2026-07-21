import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EnrollMfaCard from "./EnrollMfaCard";
import MfaManageCard from "./MfaManageCard";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-brand-900">Segurança</h1>
      <p className="mb-6 text-sm text-slate-500">
        Configurações de segurança da sua própria conta ({user.email}).
      </p>

      <div className="rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Verificação em duas etapas (MFA)
        </h2>
        {user.mfaEnabled ? <MfaManageCard /> : <EnrollMfaCard />}
      </div>
    </div>
  );
}
