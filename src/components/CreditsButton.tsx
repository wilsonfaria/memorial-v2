"use client";

import { useState } from "react";
import { Copyright, X } from "lucide-react";

export default function CreditsButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-brand-100 bg-white/90 px-3 py-1.5 text-xs text-slate-500 shadow-sm backdrop-blur hover:border-brand-300 hover:text-brand-700"
        title="Créditos e direitos autorais"
      >
        <Copyright size={13} />
        Créditos
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">Créditos</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-50"
              >
                <X size={16} />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{text}</p>
            <p className="mt-2 text-xs text-slate-400">© {year}. Todos os direitos reservados.</p>
          </div>
        </div>
      )}
    </>
  );
}
