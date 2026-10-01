"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Power, Sparkles } from "lucide-react";
import { aiWorkerSetAction, aiWorkerStatusAction } from "@/lib/actions/pipeline-actions";
import type { WorkerPhase } from "@/lib/ocr-revision/worker";

type Status = Awaited<ReturnType<typeof aiWorkerStatusAction>>;

const PAUSES: { value: number; label: string }[] = [
  { value: 0, label: "sem pausa extra" },
  { value: 10, label: "10 s" },
  { value: 20, label: "20 s" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
];

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function phaseText(phase: WorkerPhase, resumeAt: string | null): { text: string; tone: "ok" | "warn" | "idle" | "err" } {
  switch (phase) {
    case "working":
      return { text: "Transcrevendo…", tone: "ok" };
    case "pausing":
      return { text: `Pausa entre páginas${resumeAt ? ` · próxima às ${time(resumeAt)}` : ""}`, tone: "ok" };
    case "quota":
      return { text: `Cota gratuita do dia esgotada · volta sozinha ${resumeAt ? `em ${dateTime(resumeAt)}` : "amanhã"}`, tone: "warn" };
    case "backoff":
      return { text: `Várias falhas seguidas · tenta de novo ${resumeAt ? `às ${time(resumeAt)}` : "em breve"}`, tone: "err" };
    case "done":
      return { text: "Nada pendente · verifica novas edições a cada 10 min", tone: "ok" };
    case "no-key":
      return { text: "Nenhuma chave de API configurada para o provedor de IA ativo", tone: "err" };
    default:
      return { text: "Desligada", tone: "idle" };
  }
}

const TONE = {
  ok: "bg-green-50 text-green-700 ring-green-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  err: "bg-red-50 text-red-700 ring-red-200",
  idle: "bg-paper-100 text-slate-500 ring-paper-200",
};

/**
 * Switch for the server-side background transcription (worker.ts): it goes
 * through every pending page by itself, paced for the free Gemini tier.
 */
export default function AiWorkerPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    aiWorkerStatusAction().then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  function save(enabled: boolean, intervalSec: number) {
    startTransition(async () => setStatus(await aiWorkerSetAction(enabled, intervalSec)));
  }

  if (!status) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-paper-200 bg-white p-5 text-xs text-slate-400 shadow-sm">
        <Loader2 size={14} className="animate-spin" /> Carregando a transcrição automática…
      </div>
    );
  }

  const { enabled, intervalSec, state, stats, entities, semantic } = status;
  const phase = phaseText(enabled ? state.phase : "off", state.resumeAt);
  const pct = stats.total ? Math.round((stats.revised / stats.total) * 100) : 0;

  return (
    <div className="mb-6 rounded-xl border border-paper-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 text-brand-600" />
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Transcrição automática (IA)</h2>
            <p className="mt-0.5 max-w-prose text-xs text-slate-500">
              Transcreve sozinha todas as páginas pendentes e, de cada página transcrita, extrai as matérias, pessoas e
              lugares (1 pedido a mais por página) — no servidor, pode fechar o navegador. Respeita o plano
              gratuito: cada modelo fica abaixo do seu limite por minuto (Flash Lite 15, Flash 5), mais a pausa
              escolhida entre páginas. Quando a cota
              do dia acaba, espera o Google renovar (por volta das 4h–5h) e continua de onde parou.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => save(!enabled, intervalSec)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            enabled ? "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50" : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
          {enabled ? "Desligar" : "Ligar"}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ring-1 ${TONE[phase.tone]}`}>{phase.text}</span>
        <label className="flex items-center gap-1.5 text-slate-500">
          Pausa entre páginas
          <select
            value={intervalSec}
            disabled={pending}
            onChange={(e) => save(enabled, Number(e.target.value))}
            className="rounded-md border border-paper-200 bg-white px-1.5 py-1 text-xs text-slate-700"
          >
            {PAUSES.some((p) => p.value === intervalSec) ? null : <option value={intervalSec}>{intervalSec} s</option>}
            {PAUSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>
          {stats.revised} de {stats.total} páginas transcritas ({pct}%) · {stats.pending} pendentes
          {stats.failed > 0 && <span className="text-red-600"> · {stats.failed} com erro</span>}
        </span>
        {(state.revised > 0 || state.extracted > 0 || state.embedded > 0 || state.failed > 0) && (
          <span>
            desde o último deploy: {state.revised} transcritas · {state.extracted ?? 0} extraídas ·{" "}
            {state.embedded ?? 0} com vetores
            {state.failed > 0 ? ` · ${state.failed} falhas` : ""}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500">
        Dados extraídos: <strong className="text-slate-700">{entities.people}</strong> pessoas ·{" "}
        <strong className="text-slate-700">{entities.places}</strong> lugares
        {entities.extractPending > 0 && ` · ${entities.extractPending} página(s) transcrita(s) aguardando extração`}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Busca semântica:{" "}
        {semantic.configured ? (
          <>
            <strong className="text-slate-700">{semantic.embedded}</strong> páginas com vetores
            {semantic.pending > 0 && ` · ${semantic.pending} aguardando`}
          </>
        ) : (
          "desligada (sem chave do Gemini)"
        )}
      </p>

      {state.last && (
        <p
          className={`mt-2 font-mono text-[11px] ${
            state.last.kind === "err" ? "text-red-600" : state.last.kind === "ok" ? "text-slate-600" : "text-slate-400"
          }`}
        >
          {time(state.last.at)} · {state.last.text}
        </p>
      )}
    </div>
  );
}
