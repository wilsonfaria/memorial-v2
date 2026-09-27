"use client";

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import {
  getSearchIndexStatusAction,
  reindexSearchBatchAction,
  type SearchIndexStatus,
} from "@/lib/actions/edition-actions";
import type { ReindexMode } from "@/lib/search/indexer";

const MODE_LABEL: Record<ReindexMode, string> = {
  missing: "Indexar edições sem texto",
  all: "Reextrair todas",
  sync: "Reenviar ao Meilisearch",
};

const MODE_HELP: Record<ReindexMode, string> = {
  missing: "Lê o texto dos PDFs que ainda não estão na busca (uso normal, e a carga inicial).",
  all: "Relê todos os PDFs do zero. Demora mais — só se o texto salvo estiver errado.",
  sync: "Reconstrói o índice do Meilisearch a partir do texto já salvo, sem ler os PDFs (rápido).",
};

/**
 * Admin control for the newspaper full-text index. Runs the chosen mode in a
 * loop of short server-action batches (reindexSearchBatchAction), showing
 * progress, so it works for hundreds of PDFs without hitting request timeouts.
 */
export default function SearchIndexPanel({ initialStatus }: { initialStatus: SearchIndexStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [running, setRunning] = useState<ReindexMode | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<{ id: number; error: string }[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function run(mode: ReindexMode) {
    if (mode === "all" && !window.confirm("Reextrair o texto de todas as edições a partir dos PDFs? Isso pode levar vários minutos.")) {
      return;
    }
    setRunning(mode);
    setFailures([]);
    setMessage(null);
    let cursor = 0;
    let done = 0;
    const failed: { id: number; error: string }[] = [];
    try {
      for (;;) {
        const r = await reindexSearchBatchAction(mode, cursor);
        if ("error" in r) {
          setMessage({ kind: "error", text: r.error });
          break;
        }
        done += r.processed;
        failed.push(...r.failed);
        setFailures([...failed]);
        setProgress({ done, total: done + r.remaining });
        if (r.nextCursor == null) {
          setMessage({
            kind: failed.length ? "error" : "ok",
            text: `${done} edição(ões) processada(s)${failed.length ? ` · ${failed.length} com problema` : " sem erros"}.`,
          });
          break;
        }
        cursor = r.nextCursor;
      }
    } catch (err) {
      setMessage({ kind: "error", text: `Interrompido: ${(err as Error).message}` });
    } finally {
      setRunning(null);
      setStatus(await getSearchIndexStatusAction());
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const { meili } = status;

  return (
    <div className="mb-6 rounded-xl border border-paper-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <Search size={16} className="mt-0.5 text-brand-600" />
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Busca no texto dos jornais</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <strong>{status.editionsWithText}</strong> de {status.editions} edições com texto pesquisável ·{" "}
            {status.pages} páginas ·{" "}
            {!meili.configured ? (
              <span className="text-amber-700">Meilisearch não configurado — busca pelo MariaDB</span>
            ) : !meili.reachable ? (
              <span className="text-red-600">Meilisearch fora do ar — busca pelo MariaDB</span>
            ) : meili.pendingTasks > 0 ? (
              <span className="text-slate-500">
                Meilisearch processando ({meili.documents} páginas até agora, {meili.pendingTasks} tarefa(s) na fila) —
                recarregue em instantes
              </span>
            ) : (
              <span className={meili.documents === status.pages ? "text-green-700" : "text-amber-700"}>
                Meilisearch: {meili.documents} páginas no índice
                {meili.documents !== status.pages && " (diferente do banco — use “Reenviar ao Meilisearch”)"}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["missing", "sync", "all"] as ReindexMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => run(mode)}
            disabled={running != null || (mode === "sync" && !meili.configured)}
            title={MODE_HELP[mode]}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              mode === "missing"
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "border border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            <RefreshCw size={12} className={running === mode ? "animate-spin" : ""} />
            {MODE_LABEL[mode]}
          </button>
        ))}
      </div>

      {(running || progress) && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-paper-200">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {progress && (
            <p className="mt-1 text-xs tabular-nums text-slate-500">
              {progress.done} / {progress.total} ({pct}%)
            </p>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-2 text-xs ${message.kind === "ok" ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
      )}
      {failures.length > 0 && (
        <ul className="mt-1 max-h-32 overflow-auto text-[11px] text-slate-500">
          {failures.map((f) => (
            <li key={f.id}>
              Edição {f.id}: {f.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
