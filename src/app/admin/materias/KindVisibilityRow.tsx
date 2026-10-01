"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ExternalLink, Lock } from "lucide-react";
import { setKindHiddenAction } from "@/lib/actions/kind-visibility-actions";
import type { ArticleKind } from "@/lib/entities/kinds";

type Row = { kind: ArticleKind; label: string; count: number; hidden: boolean; locked: boolean };

export default function KindVisibilityRow({ row }: { row: Row }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setKindHiddenAction(row.kind, !row.hidden);
      router.refresh();
    });
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
        row.hidden ? "border-amber-200 bg-amber-50/60" : row.locked ? "border-paper-200 bg-paper-50" : "border-paper-200 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {row.label}
          {row.locked && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              <Lock size={10} /> sempre oculto (LGPD)
            </span>
          )}
          {row.hidden && !row.locked && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">oculto</span>
          )}
        </p>
        <p className="text-xs text-slate-400">{row.count} matéria(s) deste tipo na transcrição</p>
      </div>

      {!row.hidden && !row.locked && row.count > 0 && (
        <a
          href={`/materias/${row.kind}`}
          target="_blank"
          rel="noreferrer"
          title="Ver no site"
          className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
        >
          <ExternalLink size={14} />
        </a>
      )}

      {!row.locked && (
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 disabled:opacity-50 ${
            row.hidden
              ? "text-brand-700 ring-brand-200 hover:bg-brand-50"
              : "text-amber-800 ring-amber-200 hover:bg-amber-50"
          }`}
        >
          {row.hidden ? (
            <>
              <Eye size={13} /> Mostrar
            </>
          ) : (
            <>
              <EyeOff size={13} /> Ocultar
            </>
          )}
        </button>
      )}
    </div>
  );
}
