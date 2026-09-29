"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, ChevronDown, Home, Menu, Search, X } from "lucide-react";
import type { PublicMenuItem } from "@/lib/menu-repo";

export default function MainNavigation({ items }: { items: PublicMenuItem[] }) {
  const pathname = usePathname();
  // A new route starts with closed disclosures, including browser back/forward.
  return <NavigationContent key={pathname} items={items} pathname={pathname} />;
}

function NavigationContent({ items, pathname }: { items: PublicMenuItem[]; pathname: string }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const prefix = useId();
  const router = useRouter();

  function closeAll() {
    setOpenId(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function onOutsidePointer(event: globalThis.PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpenId(null);
        setMobileOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", onOutsidePointer);
    return () => document.removeEventListener("pointerdown", onOutsidePointer);
  }, []);

  function isActive(url: string) {
    return pathname === url || (url.startsWith("/") && url !== "/" && pathname.startsWith(`${url}/`));
  }

  return (
    <div
      ref={root}
      className="memorial-nav w-full bg-brand-900"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeAll();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (openId !== null) {
          document.getElementById(`${prefix}-trigger-${openId}`)?.focus();
          setOpenId(null);
        } else if (searchOpen) {
          searchToggle.current?.focus();
          setSearchOpen(false);
        } else if (mobileOpen) {
          mobileToggle.current?.focus();
          setMobileOpen(false);
        }
      }}
    >
      <div className="nav-bar mx-auto flex max-w-7xl flex-wrap items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={closeAll} className="nav-home" aria-label="Página inicial" title="Página inicial">
          <Home size={18} aria-hidden="true" />
        </Link>

        <nav id={`${prefix}-navigation`} aria-label="Navegação principal" className={`nav-links ${mobileOpen ? "block" : "hidden"} lg:block`}>
          <ul className="nav-list">
            {items.map((item) => {
              const hasChildren = item.children.length > 0;
              const open = openId === item.id;
              const active = isActive(item.url) || item.children.some((child) => isActive(child.url));
              const overviewChild = item.children.find((child) => child.url === item.url && child.openNewTab === item.openNewTab);
              const panelId = `${prefix}-panel-${item.id}`;
              return (
                <li key={item.id} className="nav-item">
                  {hasChildren ? (
                    <button
                      id={`${prefix}-trigger-${item.id}`}
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      className={`nav-trigger ${active ? "is-active" : ""}`}
                      onClick={() => { setOpenId(open ? null : item.id); setSearchOpen(false); }}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowDown") return;
                        event.preventDefault();
                        setOpenId(item.id);
                        setSearchOpen(false);
                        requestAnimationFrame(() => document.getElementById(panelId)?.querySelector("a")?.focus());
                      }}
                    >
                      {item.label}<ChevronDown size={14} className="nav-chevron" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      href={item.url}
                      target={item.openNewTab ? "_blank" : undefined}
                      rel={item.openNewTab ? "noopener noreferrer" : undefined}
                      aria-current={pathname === item.url ? "page" : undefined}
                      className={`nav-trigger ${active ? "is-active" : ""}`}
                      onClick={closeAll}
                    >{item.label}</Link>
                  )}

                  {hasChildren && (
                    <div id={panelId} hidden={!open} className="nav-submenu">
                      <div className="nav-submenu-surface">
                        <div className="nav-submenu-heading">
                          <span>Navegue por esta seção</span>
                          <p>{item.label}</p>
                        </div>
                        <Link
                          href={item.url}
                          target={item.openNewTab ? "_blank" : undefined}
                          rel={item.openNewTab ? "noopener noreferrer" : undefined}
                          aria-current={pathname === item.url ? "page" : undefined}
                          className="nav-overview"
                          onClick={closeAll}
                        >{overviewChild?.label ?? "Visão geral"}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                        <ul className="nav-submenu-list">
                          {item.children.filter((child) => child.id !== overviewChild?.id).map((child) => (
                            <li key={child.id}>
                              <Link
                                href={child.url}
                                target={child.openNewTab ? "_blank" : undefined}
                                rel={child.openNewTab ? "noopener noreferrer" : undefined}
                                aria-current={pathname === child.url ? "page" : undefined}
                                className={`nav-child ${isActive(child.url) ? "is-active" : ""}`}
                                onClick={closeAll}
                              ><span>{child.label}</span><ArrowRight size={15} aria-hidden="true" /></Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="nav-actions">
          <button
            ref={searchToggle}
            type="button"
            className="nav-icon-button"
            aria-label={searchOpen ? "Fechar busca" : "Buscar edições"}
            aria-expanded={searchOpen}
            aria-controls={`${prefix}-search`}
            onClick={() => { setSearchOpen(!searchOpen); setOpenId(null); setMobileOpen(false); }}
          >{searchOpen ? <X size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}</button>
          <button
            ref={mobileToggle}
            type="button"
            className="nav-mobile-toggle lg:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls={`${prefix}-navigation`}
            onClick={() => { setMobileOpen(!mobileOpen); setOpenId(null); setSearchOpen(false); }}
          >{mobileOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}<span>Menu</span></button>
        </div>
      </div>

      <div id={`${prefix}-search`} hidden={!searchOpen} className="nav-search-panel">
        {searchOpen && (
          <form
            role="search"
            className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8"
            onSubmit={(event) => {
              event.preventDefault();
              const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
              closeAll();
              router.push(`/edicoes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <input name="q" type="search" autoFocus aria-label="Buscar no acervo" placeholder="Busque uma história, palavra ou edição..." className="min-w-0 flex-1 rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60" />
            <button type="submit" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-900">Buscar</button>
          </form>
        )}
      </div>
    </div>
  );
}
