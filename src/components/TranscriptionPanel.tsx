"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { reflowText } from "@/lib/ocr-revision/reflow";
import {
  suggestTranscriptionAction,
  type TranscriptionSuggestionState,
} from "@/lib/actions/transcription-suggestion-actions";

type Transcription = { page: number; text: string | null; model: string | null; revisedAt: string | null };

/** A clicked "[ilegível]": its order on the page and the words shown right before it. */
type IllegibleSpot = { occurrence: number; seenBefore: string };

/**
 * "### Título\ntexto" articles → headings + paragraphs, with [ilegível]/[?]
 * highlighted. With `onIllegible`, each [ilegível] becomes a button so a
 * reader can suggest what it says.
 */
export function Articles({ text, onIllegible }: { text: string; onIllegible?: (spot: IllegibleSpot) => void }) {
  const articles = reflowText(text)
    .split(/^###\s*/m)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [first, ...rest] = c.split("\n");
      return { title: first.trim().replace(/^sem título$/i, ""), body: rest.join("\n").trim() };
    });
  // Markers are numbered in reading order, the same order the server counts them in.
  let occurrence = 0;
  const mark = (s: string) =>
    s.split(/(\[ilegível\]|\[\?\])/g).map((part, i, parts) => {
      if (part !== "[ilegível]" && part !== "[?]") return part;
      const className = "rounded bg-amber-100 px-0.5 text-[0.85em] text-amber-800";
      if (part === "[ilegível]" && onIllegible) {
        // Words since the previous [ilegível] only — the server's context stops there too.
        const seenBefore = parts.slice(0, i).join("").split("[ilegível]").at(-1)!.slice(-30);
        const spot = { occurrence: occurrence++, seenBefore };
        return (
          <button
            key={i}
            type="button"
            onClick={() => onIllegible(spot)}
            className={`${className} underline decoration-dotted underline-offset-2 hover:bg-amber-200`}
            title="Consegue ler este trecho no jornal ao lado? Clique para sugerir."
          >
            {part}
          </button>
        );
      }
      if (part === "[ilegível]") occurrence++;
      return (
        <mark key={i} className={className} title="Trecho ilegível ou de leitura duvidosa no original">
          {part}
        </mark>
      );
    });

  return (
    <div className="flex flex-col gap-4">
      {articles.map((a, i) => (
        <article key={i}>
          {a.title && <h3 className="mb-1 font-display text-base font-bold leading-snug text-brand-900">{mark(a.title)}</h3>}
          {a.body.split(/\n{2,}/).map((p, j) => (
            <p key={j} className="mb-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
              {mark(p)}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}

/** Visitor form for one [ilegível] (see lib/transcription-suggestions). Remounted per spot. */
function SuggestReadingForm({
  editionId,
  page,
  spot,
  onClose,
}: {
  editionId: number;
  page: number;
  spot: IllegibleSpot;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<TranscriptionSuggestionState, FormData>(
    suggestTranscriptionAction,
    undefined
  );

  return (
    <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-3">
      {state?.success ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-green-800">{state.success}</p>
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:underline">
            Fechar
          </button>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-1.5">
          <p className="text-[11px] leading-snug text-amber-900">
            <span className="text-slate-500">…{spot.seenBefore}</span> <strong>[ilegível]</strong> — o que está
            escrito aqui no jornal?
          </p>
          <input type="hidden" name="editionId" value={editionId} />
          <input type="hidden" name="page" value={page} />
          <input type="hidden" name="occurrence" value={spot.occurrence} />
          <input type="hidden" name="seenBefore" value={spot.seenBefore} />
          {/* Honeypot — hidden from people, filled by bots. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <input
            name="reading"
            required
            maxLength={200}
            autoFocus
            placeholder="Palavras que você lê no original"
            className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <input
            name="submitterName"
            maxLength={100}
            placeholder="Seu nome (opcional)"
            className="w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs outline-none focus:border-amber-400"
          />
          {state?.error && <p className="text-[11px] text-red-600">{state.error}</p>}
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-md bg-accent-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar para revisão"}
            </button>
            <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Reader side panel with the AI transcription of the page being viewed. */
export default function TranscriptionPanel({ editionId, page }: { editionId: number; page: number }) {
  // Each response is tagged with the edition/page it belongs to, so turning
  // the page shows "loading" until the matching one arrives.
  const key = `${editionId}-${page}`;
  const [loaded, setLoaded] = useState<{ key: string; data: Transcription | null; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/editions/${editionId}/transcription?page=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Transcription) => !cancelled && setLoaded({ key, data: d, error: false }))
      .catch(() => !cancelled && setLoaded({ key, data: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [editionId, page, key]);

  const [spot, setSpot] = useState<(IllegibleSpot & { key: string }) | null>(null);
  const current = loaded?.key === key ? loaded : null;
  const data = current?.data ?? null;
  const error = current?.error ?? false;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] leading-snug text-amber-900">
        <Sparkles size={11} className="mr-1 inline" />
        Transcrição feita por inteligência artificial a partir da imagem da página, mantendo a ortografia da época. Pode
        conter erros — em caso de dúvida, confira no jornal ao lado.
      </div>
      <div className="flex-1 overflow-auto px-4 py-4">
        {error ? (
          <p className="text-sm text-slate-500">Não foi possível carregar a transcrição.</p>
        ) : !data ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </p>
        ) : data.text ? (
          <Articles text={data.text} onIllegible={(s) => setSpot({ ...s, key })} />
        ) : (
          <p className="text-sm text-slate-500">A página {page} desta edição ainda não foi transcrita.</p>
        )}
      </div>
      {spot?.key === key && (
        <SuggestReadingForm
          key={`${key}-${spot.occurrence}`}
          editionId={editionId}
          page={page}
          spot={spot}
          onClose={() => setSpot(null)}
        />
      )}
    </div>
  );
}
