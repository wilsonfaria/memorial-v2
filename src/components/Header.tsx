"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Newspaper, Library, Handshake, FileText } from "lucide-react";
import type { MenuPage } from "@/lib/data";

export default function Header({
  newspaperName,
  logoUrl,
  tagline,
  menuPages,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  menuPages: MenuPage[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Início", icon: <Newspaper size={15} /> },
    { href: "/edicoes", label: "Todas as edições", icon: <Library size={15} /> },
    { href: "/apoiadores", label: "Apoiadores", icon: <Handshake size={15} /> },
    ...menuPages.map((p) => ({
      href: `/${p.slug}`,
      label: p.menuLabel ?? p.title,
      icon: <FileText size={15} />,
    })),
  ];

  return (
    <header className="w-full bg-brand-700">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo ${newspaperName}`}
              className="h-9 w-auto shrink-0 rounded bg-white/95 px-1.5 py-1 object-contain"
            />
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold text-white">{newspaperName}</span>
            <span className="truncate text-xs text-white/60">{tagline}</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
          title={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 border-t border-white/15 px-4 py-3 sm:px-6 lg:px-8 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === link.href ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
