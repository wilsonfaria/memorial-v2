"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type EditionModalContextValue = {
  openEditionId: number | null;
  openEdition: (id: number) => void;
  closeEdition: () => void;
};

const EditionModalContext = createContext<EditionModalContextValue | null>(null);

export function EditionModalProvider({ children }: { children: ReactNode }) {
  const [openEditionId, setOpenEditionId] = useState<number | null>(null);

  const value = useMemo(
    () => ({
      openEditionId,
      openEdition: (id: number) => setOpenEditionId(id),
      closeEdition: () => setOpenEditionId(null),
    }),
    [openEditionId]
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
