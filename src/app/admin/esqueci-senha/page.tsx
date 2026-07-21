import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-brand-900">Esqueci minha senha</h1>
        <p className="mb-6 text-sm text-slate-500">
          Informe o email cadastrado. Enviaremos um link para você definir uma nova senha.
        </p>
        <ForgotPasswordForm />
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
