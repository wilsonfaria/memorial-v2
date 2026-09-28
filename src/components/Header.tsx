"use client";

import { useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, ChevronDown } from "lucide-react";
import type { PublicMenuItem } from "@/lib/menu-repo";
import { QuillIcon } from "@/components/icons";
import SocialLinks from "@/components/SocialLinks";
import AccessibilityBar from "@/components/AccessibilityBar";

export default function Header({
  newspaperName,
  logoUrl,
  tagline,
  menuItems,
  facebookUrl,
  instagramUrl,
  xUrl,
  youtubeUrl,
  mastheadImageUrl,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  menuItems: PublicMenuItem[];
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
  mastheadImageUrl?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  function moveMasthead(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--masthead-x", `${(x - 0.5) * 18}px`);
    event.currentTarget.style.setProperty("--masthead-y", `${(y - 0.5) * 10}px`);
    event.currentTarget.style.setProperty("--masthead-light-x", `${x * 100}%`);
  }

  function resetMasthead(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--masthead-x", "0px");
    event.currentTarget.style.setProperty("--masthead-y", "0px");
    event.currentTarget.style.setProperty("--masthead-light-x", "50%");
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    setSearchOpen(false);
    router.push(`/edicoes${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
  }

  return (
    <header className="memorial-header w-full">
      {/* Top utility bar */}
      <div className="hidden bg-slate-800 px-4 py-1.5 sm:px-6 lg:block lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SocialLinks
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            xUrl={xUrl}
            youtubeUrl={youtubeUrl}
            className="text-white/60"
          />
          <AccessibilityBar />
        </div>
      </div>

      {/* Masthead */}
      <div
        className="memorial-masthead relative flex min-h-[180px] items-center bg-paper-50 px-4 py-4 sm:px-6 lg:px-8"
        onPointerMove={moveMasthead}
        onPointerLeave={resetMasthead}
      >
        <span className="masthead-scenery" aria-hidden="true">
          <span style={mastheadImageUrl ? { backgroundImage: `url(${mastheadImageUrl})` } : undefined} />
        </span>
        <span className="masthead-glow" aria-hidden="true" />
        <div className="masthead-content mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="masthead-values hidden shrink-0 text-xs font-semibold uppercase leading-tight tracking-wide text-brand-700 sm:block">
            <span>História</span>
            <span>Cultura</span>
            <span>Memória</span>
            <span>Identidade</span>
          </div>

          <Link href="/" className="masthead-brand flex min-w-0 flex-1 items-center justify-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${newspaperName}`}
                className="h-auto w-full max-w-[445px] object-contain"
              />
            ) : (
              <>
                <QuillIcon className="h-[48px] w-[48px] shrink-0 text-brand-900" />
                <div className="flex min-w-0 flex-col items-center leading-tight">
                  <span className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <span className="h-px w-[34px] bg-slate-300" />
                    Memorial do Jornal
                    <span className="h-px w-[34px] bg-slate-300" />
                  </span>
                  <span className="truncate font-display text-[30px] font-bold text-brand-900 sm:text-[41px]">
                    {newspaperName}
                  </span>
                  <span className="truncate text-[12px] uppercase tracking-wide text-slate-500">{tagline}</span>
                </div>
              </>
            )}
          </Link>

          <div className="masthead-legacy hidden shrink-0 items-center gap-4 lg:flex">
            <div className="text-right leading-tight">
              <p className="font-display text-3xl font-bold text-brand-900">105 ANOS</p>
              <p className="text-sm text-slate-500">de história viva</p>
            </div>
            <span className="h-12 w-px bg-slate-300" />
            <div className="max-w-[11rem] text-right text-sm leading-tight text-slate-500">
              <p className="italic">Preservar o passado</p>
              <p className="italic">é construir o futuro.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav bar */}
      <div className="memorial-nav w-full bg-brand-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            title="Início"
          >
            <Home size={17} />
          </Link>

          <nav className="hidden flex-1 items-center justify-between lg:flex">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.id} item={item} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? "Fechar busca" : "Buscar edições"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              title="Buscar edições"
            >
              <Search size={17} />
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white lg:hidden"
              title={mobileOpen ? "Fechar menu" : "Abrir menu"}
            >
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="header-panel border-t border-white/15 bg-brand-800 px-4 py-3 sm:px-6 lg:px-8">
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-7xl items-center gap-2">
              <input
                name="q"
                type="text"
                autoFocus
                placeholder="Buscar por título, número ou palavra dentro das edições..."
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-white/90"
              >
                Buscar
              </button>
            </form>
          </div>
        )}

        {mobileOpen && (
          <nav className="header-panel flex flex-col gap-1 border-t border-white/15 px-4 py-3 sm:px-6 lg:hidden lg:px-8">
            {menuItems.map((item) => (
              <MobileMenuItem key={item.id} item={item} onNavigate={() => setMobileOpen(false)} />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function DesktopMenuItem({ item }: { item: PublicMenuItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hasChildren = item.children.length > 0;
  const active = pathname === item.url;

  return (
    <div
      className="relative"
      onMouseEnter={() => hasChildren && setOpen(true)}
      onMouseLeave={() => hasChildren && setOpen(false)}
      onFocus={() => hasChildren && setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Link
        href={item.url}
        target={item.openNewTab ? "_blank" : undefined}
        rel={item.openNewTab ? "noopener noreferrer" : undefined}
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? open : undefined}
        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors ${
          active || open ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
        }`}
      >
        {item.label}
        {hasChildren && (
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={open ? "rotate-180 transition-transform" : "transition-transform"}
          />
        )}
      </Link>

      {hasChildren && open && (
        <div className="header-panel absolute left-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-lg border border-paper-200 bg-white py-1 shadow-lg">
          {item.children.map((child) => (
            <Link
              key={child.id}
              href={child.url}
              target={child.openNewTab ? "_blank" : undefined}
              rel={child.openNewTab ? "noopener noreferrer" : undefined}
              className="block px-3 py-2 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-800"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenuItem({ item, onNavigate }: { item: PublicMenuItem; onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <div>
      <MobileLink item={item} active={pathname === item.url} onClick={onNavigate} />
      {item.children.length > 0 && (
        <div className="ml-4 flex flex-col gap-1 border-l border-white/15 pl-3">
          {item.children.map((child) => (
            <MobileLink key={child.id} item={child} active={pathname === child.url} onClick={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileLink({
  item,
  active,
  onClick,
}: {
  item: { id: number; label: string; url: string; openNewTab: boolean };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.url}
      target={item.openNewTab ? "_blank" : undefined}
      rel={item.openNewTab ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"
      }`}
    >
      {item.label}
    </Link>
  );
}

/** Hand-rolled so the hamburger/close glyph is a plain SVG path swap, no icon library. */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M6 6L18 18M18 6L6 18"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7H20M4 12H20M4 17H20"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
