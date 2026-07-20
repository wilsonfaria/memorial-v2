import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-brand-900">Configuração inicial</h1>
        <p className="mb-6 text-sm text-slate-500">
          Crie o usuário administrador master do portal. Esta tela só pode ser usada uma vez.
        </p>
        <SetupForm />
      </div>
    </div>
  );
}
