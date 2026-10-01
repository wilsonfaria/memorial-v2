"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type EditionModalContextValue = {
  openEditionId: number | null;
  /** Page the viewer should start on (1-based) — e.g. the page a text search matched. */
  initialPage: number;
  /** Words to highlight on the page image (folded — see lib/search/highlight). */
  highlightTerms: string[];
  openEdition: (id: number, page?: number, highlightTerms?: string[]) => void;
  closeEdition: () => void;
};

const NO_TERMS: string[] = [];

const EditionModalContext = createContext<EditionModalContextValue | null>(null);

export function EditionModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ id: number; page: number; terms: string[] } | null>(null);

  const value = useMemo(
    () => ({
      openEditionId: open?.id ?? null,
      initialPage: open?.page ?? 1,
      highlightTerms: open?.terms ?? NO_TERMS,
      openEdition: (id: number, page = 1, terms: string[] = NO_TERMS) => setOpen({ id, page: Math.max(1, page), terms }),
      closeEdition: () => setOpen(null),
    }),
    [open]
  );

  return (
    <EditionModalContext.Provider value={value}>
      {children}
    </EditionModalContext.Provider>
  );
}

export function useEditionModal() {
  const ctx = useContext(EditionModalContext);
  if (!ctx) {
    throw new Error("useEditionModal must be used within EditionModalProvider");
  }
  return ctx;
}
