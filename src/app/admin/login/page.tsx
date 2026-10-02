import { redirect } from "next/navigation";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import LoginForm from "./LoginForm";
import LoginShowcase from "./LoginShowcase";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existingCount = await prisma.adminUser.count();
  if (existingCount === 0) {
    redirect("/admin/setup");
  }

  const [editions, pages, transcribed] = await Promise.all([
    prisma.edition.count({ where: { deletedAt: null } }),
    prisma.editionPage.count(),
    prisma.editionPage.count({ where: { revisedAt: { not: null } } }),
  ]);
  const transcribedPct = pages > 0 ? Math.round((transcribed / pages) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-brand-900">
            <Newspaper size={22} />
            <span className="font-display text-lg font-bold">Memorial do Jornal</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Área administrativa</h1>
          <p className="mb-8 mt-1.5 text-sm text-slate-500">Entre com seu usuário e senha para continuar.</p>
          <LoginForm />
        </div>
      </div>
      <LoginShowcase editions={editions} pages={pages} transcribedPct={transcribedPct} />
    </div>
  );
}
