"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Library, Newspaper } from "lucide-react";
import type { TreeDecade } from "@/lib/data";
import { monthName } from "@/lib/format";

export default function Sidebar({
  tree,
  collapsed,
}: {
  tree: TreeDecade[];
  collapsed: boolean;
}) {
  const pathname = usePathname();

  if (collapsed) {
    return (
      <nav className="flex flex-col items-center gap-3 py-4">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-100"
          title="Início"
        >
          <Newspaper size={18} />
        </Link>
        <Link
          href="/edicoes"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-100"
          title="Todas as edições"
        >
          <Library size={18} />
        </Link>
      </nav>
    );
  }

  return (
    <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3 text-sm">
      <Link
        href="/"
        className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
          pathname === "/" ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-brand-50"
        }`}
      >
        <Newspaper size={16} />
        Início
      </Link>
      <Link
        href="/edicoes"
        className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
          pathname === "/edicoes" ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-brand-50"
        }`}
      >
        <Library size={16} />
        Todas as edições
      </Link>

      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Acervo por período
      </p>

      <ul>
        {tree.map((decade) => (
          <DecadeNode key={decade.id} decade={decade} />
        ))}
      </ul>
    </nav>
  );
}

function DecadeNode({ decade }: { decade: TreeDecade }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-brand-50"
      >
        <ChevronRight
          size={14}
          className={`text-brand-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Década de {decade.label}
      </button>
      {open && (
        <ul className="ml-4 border-l border-brand-100 pl-2">
          {decade.years.map((year) => (
            <YearNode key={year.id} year={year} />
          ))}
        </ul>
      )}
    </li>
  );
}

function YearNode({ year }: { year: TreeDecade["years"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-slate-600 hover:bg-brand-50"
      >
        <ChevronRight
          size={13}
          className={`text-brand-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {year.year}
      </button>
      {open && (
        <ul className="ml-4 border-l border-brand-100 pl-2">
          {year.months.map((month) => (
            <li key={month.id}>
              <Link
                href={`/mes/${month.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
              >
                <span>{monthName(month.month)}</span>
                <span className="text-xs text-slate-400">{month.editionCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
