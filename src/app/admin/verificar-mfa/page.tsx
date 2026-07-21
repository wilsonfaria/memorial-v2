import { redirect } from "next/navigation";
import { getMfaPendingUserId } from "@/lib/auth";
import VerifyMfaForm from "./VerifyMfaForm";

export const dynamic = "force-dynamic";

export default async function VerifyMfaPage() {
  const pendingUserId = await getMfaPendingUserId();
  if (!pendingUserId) redirect("/admin/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-brand-900">Verificação em duas etapas</h1>
        <p className="mb-6 text-sm text-slate-500">
          Confirme sua identidade para concluir o login.
        </p>
        <VerifyMfaForm />
      </div>
    </div>
  );
}
