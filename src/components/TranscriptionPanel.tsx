"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type Transcription = { page: number; text: string | null; model: string | null; revisedAt: string | null };

/** "### Título\ntexto" articles → headings + paragraphs, with [ilegível]/[?] highlighted. */
export function Articles({ text }: { text: string }) {
  const articles = text
    .split(/^###\s*/m)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [first, ...rest] = c.split("\n");
      return { title: first.trim().replace(/^sem título$/i, ""), body: rest.join("\n").trim() };
    });
  const mark = (s: string) =>
    s.split(/(\[ilegível\]|\[\?\])/g).map((part, i) =>
      part === "[ilegível]" || part === "[?]" ? (
        <mark key={i} className="rounded bg-amber-100 px-0.5 text-[0.85em] text-amber-800" title="Trecho ilegível ou de leitura duvidosa no original">
          {part}
        </mark>
      ) : (
        part
      )
    );

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
          <Articles text={data.text} />
        ) : (
          <p className="text-sm text-slate-500">A página {page} desta edição ainda não foi transcrita.</p>
        )}
      </div>
    </div>
  );
}
