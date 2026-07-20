"use client";

import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function Header({
  newspaperName,
  logoUrl,
  collapsed,
  onToggleSidebar,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-brand-100 bg-white/80 px-4 backdrop-blur">
      <button
        onClick={onToggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50"
        title={collapsed ? "Expandir menu" : "Retrair menu"}
      >
        {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
      </button>

      {logoUrl && (
        <Image src={logoUrl} alt={`Logo ${newspaperName}`} width={32} height={32} className="rounded" />
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-brand-900">{newspaperName}</span>
        <span className="text-xs text-slate-400">Memorial digital do acervo</span>
      </div>
    </header>
  );
}
