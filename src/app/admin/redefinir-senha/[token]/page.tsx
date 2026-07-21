import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-brand-900">Redefinir senha</h1>
        <p className="mb-6 text-sm text-slate-500">Escolha uma nova senha para sua conta.</p>
        <ResetPasswordForm token={token} />
        <Link
          href="/admin/login"
          className="mt-4 block text-center text-xs text-brand-600 underline hover:text-brand-700"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
