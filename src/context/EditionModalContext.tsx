"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type EditionModalContextValue = {
  openEditionId: number | null;
  /** Page the viewer should start on (1-based) — e.g. the page a text search matched. */
  initialPage: number;
  openEdition: (id: number, page?: number) => void;
  closeEdition: () => void;
};

const EditionModalContext = createContext<EditionModalContextValue | null>(null);

export function EditionModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ id: number; page: number } | null>(null);

  const value = useMemo(
    () => ({
      openEditionId: open?.id ?? null,
      initialPage: open?.page ?? 1,
      openEdition: (id: number, page = 1) => setOpen({ id, page: Math.max(1, page) }),
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
