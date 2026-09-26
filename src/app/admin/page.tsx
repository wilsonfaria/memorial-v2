import Link from "next/link";
import { Newspaper, FolderTree, FileText, UploadCloud } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [newspaperCount, decadeCount, editionCount] = await Promise.all([
    prisma.newspaper.count(),
    prisma.decade.count(),
    prisma.edition.count({ where: { deletedAt: null } }),
  ]);

  return (
    <>
      <PageHeader
        title="Painel administrativo"
        description="Visão geral do acervo e atalhos para as tarefas mais frequentes."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Jornais cadastrados" value={newspaperCount} />
        <StatCard label="Décadas cadastradas" value={decadeCount} />
        <StatCard label="Edições no acervo" value={editionCount} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ShortcutTile href="/admin/jornais" icon={<Newspaper size={20} />} title="Jornais" description="Cadastrar mastheads" />
        <ShortcutTile href="/admin/categorias" icon={<FolderTree size={20} />} title="Categorias" description="Décadas, anos e meses" />
        <ShortcutTile href="/admin/edicoes" icon={<FileText size={20} />} title="Edições" description="Cadastro manual" />
        <ShortcutTile href="/admin/upload" icon={<UploadCloud size={20} />} title="Upload em massa" description="Enviar pasta completa" />
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-paper-200 bg-white p-6 shadow-sm">
      <p className="text-3xl font-semibold tracking-tight text-brand-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ShortcutTile({
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
      className="flex flex-col gap-2 rounded-xl border border-paper-200 bg-white p-6 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <span className="text-brand-500">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <span className="text-xs text-slate-400">{description}</span>
    </Link>
  );
}
