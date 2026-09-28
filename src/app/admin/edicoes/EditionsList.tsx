"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, ScanText, Check, Play, RotateCcw } from "lucide-react";
import {
  bulkDeleteEditionsAction,
  deleteEditionAction,
  extractEditionTextAction,
  type OcrActionState,
} from "@/lib/actions/edition-actions";
import type { EditionPipelineStatus } from "@/lib/pipeline";
import { formatDate, formatFileSize } from "@/lib/format";
import { PLAN_LABEL, usePipelineRunner, type RunPlan } from "./usePipelineRunner";
import RunProgress from "./RunProgress";

type EditionRow = {
  id: number;
  title: string;
  publishedAt: Date;
  fileSizeBytes: number | null;
  editionNumber: number | null;
  hasExtractedText: boolean;
  month: { year: { year: number; decade: { label: string } } };
};

const SELECTION_PLANS: RunPlan[] = ["full", "revise", "retry-ai", "redo-ai", "extract", "index"];

/** One pipeline stage as a small colored chip: done / partial / pending / error / off. */
function Chip({ label, state, title }: { label: string; state: "done" | "partial" | "pending" | "error" | "off"; title: string }) {
  const cls = {
    done: "bg-green-50 text-green-700 ring-green-200",
    partial: "bg-sky-50 text-sky-700 ring-sky-200",
    pending: "bg-slate-50 text-slate-400 ring-slate-200",
    error: "bg-red-50 text-red-600 ring-red-200",
    off: "bg-slate-50 text-slate-300 ring-slate-100",
  }[state];
  return (
    <span title={title} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function PipelineChips({ s }: { s?: EditionPipelineStatus }) {
  if (!s) return null;
  const total = s.pageCount ?? s.pages;
  const text: Parameters<typeof Chip>[0]["state"] = s.pages === 0 ? "pending" : s.pages < total ? "partial" : "done";
  const ai: Parameters<typeof Chip>[0]["state"] =
    s.revisionErrors > 0 ? "error" : s.pages === 0 || s.revised === 0 ? "pending" : s.revised < s.pages ? "partial" : "done";
  const search: Parameters<typeof Chip>[0]["state"] =
    s.inSearch == null ? "off" : s.inSearch === 0 ? "pending" : s.inSearch < s.pages ? "partial" : "done";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Chip label="PDF" state="done" title="PDF enviado" />
      <Chip label={`Texto ${s.pages}/${total}`} state={text} title="Páginas com texto lido do PDF" />
      <Chip
        label={`IA ${s.revised}/${s.pages}${s.revisionErrors ? ` · ${s.revisionErrors} erro` : ""}`}
        state={ai}
        title="Páginas transcritas pela IA a partir da imagem"
      />
      <Chip
        label={s.inSearch == null ? "Busca: MariaDB" : `Busca ${s.inSearch}/${s.pages}`}
        state={search}
        title={s.inSearch == null ? "Meilisearch fora — a busca usa o MariaDB" : "Páginas desta edição no Meilisearch"}
      />
    </div>
  );
}

export default function EditionsList({
  editions,
  pipeline,
}: {
  editions: EditionRow[];
  pipeline: Record<number, EditionPipelineStatus>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<RunPlan>("full");
  const runner = usePipelineRunner();

  const allSelected = editions.length > 0 && selected.size === editions.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(editions.map((e) => e.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Mover ${selected.size} edição(ões) selecionada(s) para a lixeira?`)) {
      return;
    }
    startTransition(async () => {
      const result = await bulkDeleteEditionsAction(Array.from(selected));
      setMessage(result?.error ?? result?.success ?? null);
      setSelected(new Set());
    });
  }

  function runOn(ids: number[], p: RunPlan) {
    if (p === "redo-ai" && !window.confirm(`Apagar a transcrição da IA de ${ids.length} edição(ões) e refazer?`)) return;
    void runner.run(ids, p);
  }

  // Keep the page's order (oldest listed last) for the selection run.
  const selectedIds = editions.filter((e) => selected.has(e.id)).map((e) => e.id);

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-brand-200" />
          Selecionar todas ({editions.length})
        </label>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500">{selected.size} selecionada(s):</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as RunPlan)}
              className="rounded-lg border border-brand-200 px-2 py-1.5"
              disabled={runner.state.running}
            >
              {SELECTION_PLANS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABEL[p]}
                </option>
              ))}
            </select>
            <button
              onClick={() => runOn(selectedIds, plan)}
              disabled={runner.state.running}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Play size={12} fill="currentColor" /> Rodar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending || runner.state.running}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 size={13} />
              {isPending ? "Removendo..." : "Remover"}
            </button>
          </div>
        )}
      </div>

      <RunProgress state={runner.state} onStop={runner.stop} onClear={runner.clear} />
      {message && <p className="mb-1 text-xs text-slate-500">{message}</p>}

      {editions.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">Nenhuma edição encontrada com esses filtros.</p>
      )}

      {editions.map((e) => (
        <div
          key={e.id}
          className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-2.5 ${
            runner.state.current === e.id ? "border-brand-400 ring-1 ring-brand-200" : "border-paper-200"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.has(e.id)}
            onChange={() => toggleOne(e.id)}
            className="h-4 w-4 shrink-0 rounded border-brand-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">
              {e.title} <span className="text-xs font-normal text-slate-400">#{e.id}</span>
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(e.publishedAt)} · {e.month.year.decade.label} / {e.month.year.year} · {formatFileSize(e.fileSizeBytes)}
              {e.editionNumber ? ` · nº ${e.editionNumber}` : ""}
            </p>
          </div>
          <PipelineChips s={pipeline[e.id]} />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => runOn([e.id], "full")}
              disabled={runner.state.running}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-100 disabled:opacity-40"
              title="Rodar o fluxo completo só nesta edição"
            >
              <Play size={13} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => runOn([e.id], "redo-ai")}
              disabled={runner.state.running}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-40"
              title="Refazer a transcrição da IA só nesta edição (rechecagem)"
            >
              <RotateCcw size={13} />
            </button>
            <OcrButton id={e.id} hasExtractedText={e.hasExtractedText} />
            <form
              action={deleteEditionAction}
              onSubmit={(ev) => {
                if (!window.confirm(`Mover a edição "${e.title}" para a lixeira?`)) {
                  ev.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remover"
              >
                <Trash2 size={13} />
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

function OcrButton({ id, hasExtractedText }: { id: number; hasExtractedText: boolean }) {
  const [state, action, pending] = useActionState<OcrActionState, FormData>(extractEditionTextAction, undefined);

  return (
    <form action={action} className="shrink-0" title={state?.error ?? state?.success ?? undefined}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className={`flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-60 ${
          hasExtractedText ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-brand-100 hover:text-brand-700"
        }`}
        title={
          pending
            ? "Extraindo texto..."
            : hasExtractedText
              ? "Reextrair o texto do PDF (com OCR nas páginas sem texto) — mantém a transcrição da IA"
              : "Extrair texto do PDF (com OCR nas páginas sem texto)"
        }
      >
        {pending ? <ScanText size={13} className="animate-pulse" /> : hasExtractedText ? <Check size={13} /> : <ScanText size={13} />}
      </button>
    </form>
  );
}
