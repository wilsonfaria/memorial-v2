import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut, Newspaper, FolderTree, FileText, UploadCloud, Database, Palette, Users, Handshake, BarChart3, Files } from "lucide-react";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-200 bg-white px-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-semibold text-brand-900">
            Administração · Memorial
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <AdminNavLink href="/admin/jornais" icon={<Newspaper size={14} />}>
              Jornais
            </AdminNavLink>
            <AdminNavLink href="/admin/categorias" icon={<FolderTree size={14} />}>
              Categorias
            </AdminNavLink>
            <AdminNavLink href="/admin/edicoes" icon={<FileText size={14} />}>
              Edições
            </AdminNavLink>
            <AdminNavLink href="/admin/upload" icon={<UploadCloud size={14} />}>
              Upload em massa
            </AdminNavLink>
            <AdminNavLink href="/admin/patrocinadores" icon={<Handshake size={14} />}>
              Patrocinadores
            </AdminNavLink>
            <AdminNavLink href="/admin/paginas" icon={<Files size={14} />}>
              Páginas
            </AdminNavLink>
            <AdminNavLink href="/admin/relatorios" icon={<BarChart3 size={14} />}>
              Relatórios
            </AdminNavLink>
            <AdminNavLink href="/admin/aparencia" icon={<Palette size={14} />}>
              Aparência
            </AdminNavLink>
            <AdminNavLink href="/admin/configuracoes" icon={<Database size={14} />}>
              Configurações
            </AdminNavLink>
            <AdminNavLink href="/admin/usuarios" icon={<Users size={14} />}>
              Usuários
            </AdminNavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{session.username}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
            >
              <LogOut size={13} />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
    >
      {icon}
      {children}
    </Link>
  );
}
