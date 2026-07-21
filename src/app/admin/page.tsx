import Link from "next/link";
import { Newspaper, FolderTree, FileText, UploadCloud } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [newspaperCount, decadeCount, editionCount] = await Promise.all([
    prisma.newspaper.count(),
    prisma.decade.count(),
    prisma.edition.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Painel administrativo</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard label="Jornais cadastrados" value={newspaperCount} />
        <StatCard label="Décadas cadastradas" value={decadeCount} />
        <StatCard label="Edições no acervo" value={editionCount} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminCard href="/admin/jornais" icon={<Newspaper size={20} />} title="Jornais" description="Cadastrar mastheads" />
        <AdminCard href="/admin/categorias" icon={<FolderTree size={20} />} title="Categorias" description="Décadas, anos e meses" />
        <AdminCard href="/admin/edicoes" icon={<FileText size={20} />} title="Edições" description="Cadastro manual" />
        <AdminCard href="/admin/upload" icon={<UploadCloud size={20} />} title="Upload em massa" description="Enviar pasta completa" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4">
      <p className="text-2xl font-semibold text-brand-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl border border-paper-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm"
    >
      <span className="text-brand-500">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <span className="text-xs text-slate-400">{description}</span>
    </Link>
  );
}
