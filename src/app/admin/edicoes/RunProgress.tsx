"use client";

import { Square, X } from "lucide-react";
import { PLAN_LABEL, type RunState } from "./usePipelineRunner";

/** Progress + log of a pipeline run (shared by the batch panel and the list selection). */
export default function RunProgress({ state, onStop, onClear }: { state: RunState; onStop: () => void; onClear: () => void }) {
  if (!state.plan) return null;
  const pct = state.total ? Math.round((state.done / state.total) * 100) : 0;
  const outcomeText =
    state.outcome === "quota"
      ? "Parou: a cota gratuita diária do Gemini acabou. O que já foi feito está salvo — continue amanhã."
      : state.outcome === "stopped"
        ? "Interrompido por você. O que já foi feito está salvo."
        : state.outcome === "done"
          ? "Concluído."
          : null;

  return (
    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">
          {PLAN_LABEL[state.plan]} · {state.done}/{state.total} edição(ões)
          {state.current != null && <span className="text-slate-500"> · processando {state.current}</span>}
        </span>
        {state.running ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            title="Termina o passo atual e para"
          >
            <Square size={10} fill="currentColor" /> Parar
          </button>
        ) : (
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-slate-600" title="Fechar">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {outcomeText && (
        <p className={`mt-1.5 text-xs ${state.outcome === "done" ? "text-green-700" : "text-amber-700"}`}>{outcomeText}</p>
      )}
      {state.log.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto font-mono text-[11px] leading-relaxed">
          {state.log.map((l, i) => (
            <li key={i} className={l.kind === "err" ? "text-red-600" : l.kind === "ok" ? "text-slate-600" : "text-slate-400"}>
              {l.edition != null && <span className="text-slate-400">{l.edition} · </span>}
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
