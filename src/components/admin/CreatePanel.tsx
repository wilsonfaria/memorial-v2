"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import Card from "./Card";

/**
 * Keeps a "create new X" form out of the way until asked for — the list below
 * it is what people open the page to see; the form is one click away instead
 * of always taking the top of the screen.
 */
export default function CreatePanel({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-8 flex items-center gap-2 rounded-xl border border-dashed border-brand-200 bg-white px-4 py-3 text-sm font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        <Plus size={16} />
        {label}
      </button>
    );
  }

  return (
    <Card
      title={title}
      description={description}
      action={
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
          title="Fechar"
        >
          <X size={15} />
        </button>
      }
      className="mb-8"
    >
      {children}
    </Card>
  );
}
