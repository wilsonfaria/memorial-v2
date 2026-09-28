"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Workflow } from "lucide-react";
import { pickEditionsAction } from "@/lib/actions/pipeline-actions";
import type { PickCriterion } from "@/lib/pipeline";
import { usePipelineRunner } from "./usePipelineRunner";
import RunProgress from "./RunProgress";

type Totals = {
  editions: number;
  noText: number;
  pages: number;
  revised: number;
  errors: number;
  fullyRevised: number;
  gemini: boolean;
};

const CRITERION_LABEL: Record<PickCriterion, string> = {
  "ai-pending": "com IA pendente",
  "no-text": "sem texto extraído",
  "ai-errors": "com páginas em erro na IA",
};

function Stage({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-lg border border-paper-200 bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone === "ok" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-slate-700"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/**
 * Archive-wide view of the pipeline (PDF → text → AI → search) plus a batch
 * runner: take the next N (or N random) editions matching a criterion and run
 * the full flow on them. Small batches suit the free Gemini tier.
 */
export default function PipelinePanel({ totals }: { totals: Totals }) {
  const { state, run, stop, clear } = usePipelineRunner();
  const [count, setCount] = useState(3);
  const [order, setOrder] = useState<"sequential" | "random">("sequential");
  const [criterion, setCriterion] = useState<PickCriterion>("ai-pending");
  const [note, setNote] = useState<string | null>(null);

  async function startBatch() {
    setNote(null);
    const ids = await pickEditionsAction(criterion, count, order);
    if (ids.length === 0) {
      setNote(`Nenhuma edição ${CRITERION_LABEL[criterion]}.`);
      return;
    }
    await run(ids, criterion === "ai-errors" ? "retry-ai" : "full");
  }

  const pct = totals.pages ? Math.round((totals.revised / totals.pages) * 100) : 0;

  return (
    <div className="mb-6 rounded-xl border border-paper-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <Workflow size={16} className="mt-0.5 text-brand-600" />
        <div>
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-sm font-semibold text-slate-700">
            Fluxo de processamento
            <Link href="/admin/edicoes/qualidade" className="text-xs font-normal text-brand-700 hover:underline">
              Qualidade da IA →
            </Link>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            PDF → texto do PDF → transcrição com IA (Gemini, lendo a imagem da página) → busca. Rode em lotes pequenos: o
            plano gratuito do Gemini tem cota diária — quando ela acaba, o processo para e continua de onde parou no dia
            seguinte. Para escolher edições específicas, marque-as na lista abaixo.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Stage label="PDFs" value={String(totals.editions)} sub="edições" />
        <Stage
          label="Texto do PDF"
          value={`${totals.editions - totals.noText}/${totals.editions}`}
          sub={`${totals.pages} páginas`}
          tone={totals.noText === 0 ? "ok" : "warn"}
        />
        <Stage
          label="Transcrição IA"
          value={`${totals.revised}/${totals.pages} pág. (${pct}%)`}
          sub={`${totals.fullyRevised} edições completas${totals.errors ? ` · ${totals.errors} pág. com erro` : ""}`}
          tone={totals.revised === totals.pages ? "ok" : undefined}
        />
      </div>

      {!totals.gemini && (
        <p className="mb-2 text-xs text-amber-700">GEMINI_API_KEY não configurada — a etapa de IA não vai rodar.</p>
      )}

      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Quantas edições</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-20 rounded-lg border border-brand-200 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Ordem</span>
          <select value={order} onChange={(e) => setOrder(e.target.value as typeof order)} className="rounded-lg border border-brand-200 px-2 py-1.5">
            <option value="sequential">Sequencial (mais antigas primeiro)</option>
            <option value="random">Aleatória</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Quais</span>
          <select value={criterion} onChange={(e) => setCriterion(e.target.value as PickCriterion)} className="rounded-lg border border-brand-200 px-2 py-1.5">
            <option value="ai-pending">Com IA pendente</option>
            <option value="no-text">Sem texto extraído</option>
            <option value="ai-errors">Com páginas em erro na IA</option>
          </select>
        </label>
        <button
          type="button"
          onClick={startBatch}
          disabled={state.running}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Play size={12} fill="currentColor" /> Rodar lote
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}

      <RunProgress state={state} onStop={stop} onClear={clear} />
    </div>
  );
}
