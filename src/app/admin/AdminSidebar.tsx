"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";
import AdminSidebarNav from "./AdminSidebarNav";

const STORAGE_KEY = "memorial_admin_sidebar_collapsed";

/**
 * `animate` is false for the value restored from storage and true only after a
 * click, so the width slides when the user toggles but snaps into place during
 * hydration (the server always renders expanded — it can't read localStorage).
 */
type SidebarState = { collapsed: boolean; animate: boolean };

const SERVER_STATE: SidebarState = { collapsed: false, animate: false };

/**
 * localStorage as an external store, so the saved preference can be read during
 * render (via useSyncExternalStore) instead of being synced in after mount —
 * which keeps SSR output and hydration in agreement without a state-in-effect.
 */
const sidebarStore = {
  listeners: new Set<() => void>(),
  state: null as SidebarState | null,

  subscribe(listener: () => void) {
    sidebarStore.listeners.add(listener);
    return () => {
      sidebarStore.listeners.delete(listener);
    };
  },

  // Must return a stable reference: a fresh object on every call would loop.
  getSnapshot(): SidebarState {
    if (sidebarStore.state === null) {
      let collapsed = false;
      try {
        collapsed = window.localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        // Blocked/unavailable storage (private windows): fall back to expanded.
      }
      sidebarStore.state = { collapsed, animate: false };
    }
    return sidebarStore.state;
  },

  getServerSnapshot(): SidebarState {
    return SERVER_STATE;
  },

  set(collapsed: boolean) {
    sidebarStore.state = { collapsed, animate: true };
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Preference just won't persist; the toggle still works for this session.
    }
    for (const listener of sidebarStore.listeners) listener();
  },
};

export default function AdminSidebar({ username }: { username: string }) {
  const { collapsed, animate } = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot
  );

  const footerItemClass = `flex items-center rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700 ${
    collapsed ? "justify-center px-0" : "gap-2.5 px-3"
  }`;

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-paper-200 bg-white ${
        animate ? "transition-[width] duration-200 ease-out" : ""
      } ${collapsed ? "w-16" : "w-60"}`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-paper-200 py-4 ${
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        }`}
      >
        {!collapsed && (
          <Link
            href="/admin"
            className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-brand-900"
          >
            Administração
          </Link>
        )}
        <button
          type="button"
          onClick={() => sidebarStore.set(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <AdminSidebarNav collapsed={collapsed} />

      <div className="mt-auto flex shrink-0 flex-col gap-1 border-t border-paper-200 p-3">
        {!collapsed && <p className="truncate px-3 py-1 text-xs text-slate-500">{username}</p>}

        <Link
          href="/admin/seguranca"
          title={collapsed ? "Segurança" : undefined}
          className={footerItemClass}
        >
          <ShieldCheck size={15} className="shrink-0" />
          {!collapsed && "Segurança"}
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            title={collapsed ? "Sair" : undefined}
            className={`w-full ${footerItemClass}`}
          >
            <LogOut size={15} className="shrink-0" />
            {!collapsed && "Sair"}
          </button>
        </form>
      </div>
    </aside>
  );
}
