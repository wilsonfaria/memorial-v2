"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import CreditsButton from "@/components/CreditsButton";
import { EditionModalProvider } from "@/context/EditionModalContext";
import type { TreeDecade } from "@/lib/data";

// pdfjs touches browser-only globals (DOMMatrix) at module load time,
// so this must never be evaluated during server-side rendering.
const EditionModal = dynamic(() => import("@/components/EditionModal"), { ssr: false });

export default function AppShell({
  newspaperName,
  logoUrl,
  tree,
  creditsText,
  children,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tree: TreeDecade[];
  creditsText: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <EditionModalProvider>
      <div className="flex h-full flex-col">
        <Header
          newspaperName={newspaperName}
          logoUrl={logoUrl}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
        />
        <div className="flex min-h-0 flex-1">
          <aside
            className={`flex shrink-0 flex-col border-r border-brand-100 bg-white/60 transition-all duration-200 ${
              collapsed ? "w-14" : "w-64"
            }`}
          >
            <Sidebar tree={tree} collapsed={collapsed} />
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <EditionModal />
      <CreditsButton text={creditsText} />
    </EditionModalProvider>
  );
}
