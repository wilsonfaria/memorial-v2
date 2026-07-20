"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { EditionCard, EditionRow, type EditionSummary } from "@/components/EditionCard";

export default function EditionsView({
  editions,
  defaultMode = "grid",
  showToggle = true,
}: {
  editions: EditionSummary[];
  defaultMode?: "grid" | "list";
  showToggle?: boolean;
}) {
  const [mode, setMode] = useState<"grid" | "list">(defaultMode);

  return (
    <div>
      {showToggle && (
        <div className="mb-4 flex items-center justify-end gap-1">
          <button
            onClick={() => setMode("grid")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              mode === "grid" ? "bg-brand-100 text-brand-700" : "text-slate-400 hover:bg-brand-50"
            }`}
            title="Exibir em grade"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setMode("list")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              mode === "list" ? "bg-brand-100 text-brand-700" : "text-slate-400 hover:bg-brand-50"
            }`}
            title="Exibir em lista"
          >
            <List size={16} />
          </button>
        </div>
      )}

      {editions.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-400">Nenhuma edição encontrada.</p>
      )}

      {mode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {editions.map((edition) => (
            <EditionCard key={edition.id} edition={edition} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {editions.map((edition) => (
            <EditionRow key={edition.id} edition={edition} />
          ))}
        </div>
      )}
    </div>
  );
}
