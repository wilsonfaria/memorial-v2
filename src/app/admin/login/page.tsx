import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existingCount = await prisma.adminUser.count();
  if (existingCount === 0) {
    redirect("/admin/setup");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-brand-900">Área administrativa</h1>
        <p className="mb-6 text-sm text-slate-500">Entre com seu usuário e senha.</p>
        <LoginForm />
      </div>
    </div>
  );
}
