"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  FolderTree,
  FileText,
  UploadCloud,
  Database,
  Palette,
  Users,
  Handshake,
  BarChart3,
  Files,
  BookOpen,
  Users2,
  Images,
  History,
  FolderKanban,
  Mail,
  LayoutTemplate,
  Menu as MenuIcon,
  Trash2,
  ChevronDown,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Acervo",
    items: [
      { href: "/admin/jornais", icon: Newspaper, label: "Jornais" },
      { href: "/admin/categorias", icon: FolderTree, label: "Categorias" },
      { href: "/admin/edicoes", icon: FileText, label: "Edições" },
      { href: "/admin/upload", icon: UploadCloud, label: "Upload em massa" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/admin/cronicas", icon: BookOpen, label: "Crônicas" },
      { href: "/admin/personagens", icon: Users2, label: "Personagens" },
      { href: "/admin/galeria", icon: Images, label: "Galeria" },
      { href: "/admin/linha-do-tempo", icon: History, label: "Linha do Tempo" },
      { href: "/admin/projetos", icon: FolderKanban, label: "Projetos" },
      { href: "/admin/paginas", icon: Files, label: "Páginas" },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/admin/pagina-inicial", icon: LayoutTemplate, label: "Página Inicial" },
      { href: "/admin/menus", icon: MenuIcon, label: "Menus" },
      { href: "/admin/patrocinadores", icon: Handshake, label: "Patrocinadores" },
      { href: "/admin/mensagens", icon: Mail, label: "Mensagens" },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/admin/aparencia", icon: Palette, label: "Aparência" },
      { href: "/admin/relatorios", icon: BarChart3, label: "Relatórios" },
      { href: "/admin/configuracoes", icon: Database, label: "Configurações" },
      { href: "/admin/usuarios", icon: Users, label: "Usuários" },
      { href: "/admin/lixeira", icon: Trash2, label: "Lixeira" },
    ],
  },
] as const;

type GroupLabel = (typeof NAV_GROUPS)[number]["label"];

export default function AdminSidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  // Only explicit clicks live here — which group is "active" (and therefore
  // open by default, before any click) is derived from pathname on every
  // render instead, so navigating to a new section opens its group for free.
  const [openOverrides, setOpenOverrides] = useState<Partial<Record<GroupLabel, boolean>>>({});

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggleGroup(label: GroupLabel, currentlyOpen: boolean) {
    setOpenOverrides((prev) => ({ ...prev, [label]: !currentlyOpen }));
  }

  return (
    <nav className={`flex flex-col overflow-y-auto py-3 ${collapsed ? "gap-2 px-2" : "gap-1 px-3"}`}>
      {NAV_GROUPS.map((group, groupIndex) => {
        const groupHasActiveItem = group.items.some((item) => isItemActive(item.href));
        const isOpen = openOverrides[group.label] ?? groupHasActiveItem;

        return (
          <div key={group.label} className="flex flex-col gap-0.5">
            {collapsed ? (
              // Icon-only mode has no room for the label, so groups are always
              // fully shown and separated by a rule instead (none above the first).
              groupIndex > 0 && <span className="mx-2 mb-2 h-px bg-paper-200" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={() => toggleGroup(group.label, isOpen)}
                aria-expanded={isOpen}
                className="mb-1 flex items-center justify-between rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:bg-brand-50 hover:text-slate-600"
              >
                {group.label}
                <ChevronDown
                  size={13}
                  className={`shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
            )}

            {(collapsed || isOpen) &&
              group.items.map(({ href, icon: Icon, label }) => (
                <SidebarLink key={href} href={href} label={label} collapsed={collapsed} active={isItemActive(href)}>
                  <Icon size={15} className="shrink-0" />
                </SidebarLink>
              ))}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarLink({
  href,
  label,
  active,
  collapsed,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-0" : "gap-2.5 px-3"
      } ${active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"}`}
    >
      {children}
      {!collapsed && label}
    </Link>
  );
}
