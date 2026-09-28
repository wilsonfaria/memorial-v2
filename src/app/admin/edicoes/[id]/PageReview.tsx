"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, History, Loader2, Pencil, RotateCcw, Sparkles, UserCheck, ZoomIn, ZoomOut } from "lucide-react";
import { Articles } from "@/components/TranscriptionPanel";
import { reflowText } from "@/lib/ocr-revision/reflow";
import {
  listVersionsAction,
  restoreVersionAction,
  saveTranscriptionAction,
  unverifyPageAction,
  verifyPageAction,
} from "@/lib/actions/review-actions";

export type ReviewPage = {
  page: number;
  text: string;
  revisedText: string | null;
  revisedModel: string | null;
  revisedAt: string | null;
  revisionError: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

type Version = Awaited<ReturnType<typeof listVersionsAction>>[number];

const fmt = (iso: string | Date) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const btn =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 disabled:opacity-50 transition-colors";

/**
 * One page in the admin review: read the AI transcription, mark it as
 * verified, correct it with the page image alongside, or go back to an older
 * version. Verified pages are the gold set that measures the AI models.
 */
export default function PageReview({ editionId, p }: { editionId: number; p: ReviewPage }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "history">("view");
  const [draft, setDraft] = useState("");
  const [zoom, setZoom] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [openVersion, setOpenVersion] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ text: r.error ?? "Falhou.", err: true });
      else {
        if (r.message) setMsg({ text: r.message });
        after?.();
        router.refresh();
      }
    });
  }

  function startEdit() {
    // No AI text yet: start from the OCR so the person corrects rather than types.
    setDraft(reflowText(p.revisedText ?? p.text));
    setMode("edit");
  }

  function showHistory() {
    setMode("history");
    setVersions(null);
    start(async () => setVersions(await listVersionsAction(editionId, p.page)));
  }

  return (
    <section className="rounded-xl border border-paper-200 bg-white p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-paper-100 pb-3">
        <h2 className="font-semibold text-brand-900">Página {p.page}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {p.revisedAt ? (
            <span className="inline-flex items-center gap-1 text-green-700">
              <Sparkles size={12} /> {p.revisedModel} · {fmt(p.revisedAt)}
            </span>
          ) : p.revisionError ? (
            <span className="text-red-600" title={p.revisionError}>
              IA falhou nesta página
            </span>
          ) : (
            <span>IA pendente</span>
          )}

          {p.verifiedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700 ring-1 ring-green-200">
              <UserCheck size={12} /> Conferida por {p.verifiedBy} em {fmt(p.verifiedAt)}
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => unverifyPageAction(editionId, p.page))}
                className="ml-1 text-slate-400 hover:text-red-600"
                title="Desmarcar como conferida"
              >
                ×
              </button>
            </span>
          ) : (
            p.revisedText && (
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => verifyPageAction(editionId, p.page))}
                className={`${btn} bg-white text-green-700 ring-green-200 hover:bg-green-50`}
                title="O texto está correto como está — entra no gabarito de qualidade"
              >
                <Check size={12} /> Conferir
              </button>
            )
          )}

          <button
            type="button"
            disabled={pending}
            onClick={mode === "edit" ? () => setMode("view") : startEdit}
            className={`${btn} ${mode === "edit" ? "bg-brand-50 text-brand-800 ring-brand-300" : "bg-white text-brand-700 ring-brand-200 hover:bg-brand-50"}`}
          >
            <Pencil size={12} /> {mode === "edit" ? "Fechar edição" : "Corrigir"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={mode === "history" ? () => setMode("view") : showHistory}
            className={`${btn} ${mode === "history" ? "bg-brand-50 text-brand-800 ring-brand-300" : "bg-white text-slate-600 ring-paper-200 hover:bg-paper-50"}`}
          >
            <History size={12} /> Histórico
          </button>
          <a
            href={`/api/editions/${editionId}/file#page=${p.page}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline"
          >
            ver no PDF
          </a>
        </div>
      </header>

      {msg && <p className={`mb-3 text-xs ${msg.err ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}

      {mode === "edit" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="relative h-[75vh] overflow-auto rounded-lg border border-paper-200 bg-paper-50">
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              className="sticky left-2 top-2 z-10 m-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600 shadow ring-1 ring-paper-200"
            >
              {zoom ? <ZoomOut size={12} /> : <ZoomIn size={12} />} {zoom ? "Ajustar" : "Ampliar"}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only rendered page, not a static asset */}
            <img
              src={`/api/admin/page-image?edition=${editionId}&page=${p.page}`}
              alt={`Página ${p.page} digitalizada`}
              className={zoom ? "max-w-none" : "w-full"}
              style={zoom ? { width: "220%" } : undefined}
            />
          </div>
          <div className="flex h-[75vh] flex-col gap-2">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Uma matéria por bloco, começando com <code className="rounded bg-paper-100 px-1">### Título</code>. Mantenha a
              grafia da época. Use <code className="rounded bg-paper-100 px-1">[ilegível]</code> e{" "}
              <code className="rounded bg-paper-100 px-1">[?]</code> onde não der para ler com certeza.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none rounded-lg border border-paper-200 p-3 font-mono text-[13px] leading-relaxed text-slate-800 focus:border-brand-400 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className={`${btn} bg-white px-3 py-1.5 text-slate-600 ring-paper-200 hover:bg-paper-50`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => saveTranscriptionAction(editionId, p.page, draft), () => setMode("view"))}
                className={`${btn} bg-brand-600 px-3 py-1.5 text-white ring-brand-600 hover:bg-brand-700`}
              >
                {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar e conferir
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "history" && (
        <div className="rounded-lg border border-paper-200 bg-paper-50 p-3">
          {!versions ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" /> Carregando…
            </p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma versão registrada.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {versions.map((v, i) => (
                <li key={v.id} className="rounded-md bg-white p-2 text-xs ring-1 ring-paper-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${v.source === "human" ? "bg-green-50 text-green-700" : "bg-brand-50 text-brand-700"}`}
                    >
                      {v.source === "human" ? `correção · ${v.author}` : `IA · ${v.model}`}
                    </span>
                    <span className="text-slate-500">{fmt(v.createdAt)}</span>
                    <span className="text-slate-400">{v.text.length} caracteres</span>
                    {i === 0 && <span className="text-slate-400">(atual)</span>}
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenVersion(openVersion === v.id ? null : v.id)}
                        className="text-brand-700 hover:underline"
                      >
                        {openVersion === v.id ? "ocultar" : "ver"}
                      </button>
                      {i > 0 && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            window.confirm("Trazer esta versão de volta como texto atual?") &&
                            act(() => restoreVersionAction(v.id), showHistory)
                          }
                          className="inline-flex items-center gap-0.5 text-slate-600 hover:text-brand-700"
                        >
                          <RotateCcw size={11} /> restaurar
                        </button>
                      )}
                    </span>
                  </div>
                  {openVersion === v.id && (
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
                      {v.text}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode !== "edit" && (
        <>
          <div className={mode === "history" ? "mt-4" : ""}>
            {p.revisedText ? (
              <Articles text={p.revisedText} />
            ) : (
              <p className="text-sm text-slate-400">
                {p.revisionError ? `Erro: ${p.revisionError.slice(0, 300)}` : "Ainda não transcrita pela IA."}
              </p>
            )}
          </div>
          <details className="mt-4 rounded-lg bg-paper-50 p-3" open={!p.revisedText}>
            <summary className="cursor-pointer text-xs font-medium text-slate-500">Texto original do OCR</summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600">
              {p.text || "(vazio)"}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}
