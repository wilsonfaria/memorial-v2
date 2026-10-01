"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCirclePlus, Pause, Play, X } from "lucide-react";
import { suggestPhotoCaptionAction, type SuggestionActionState } from "@/lib/actions/gallery-suggestion-actions";
import { wrapIndex } from "@/lib/gallery-suggestions";

type Photo = { id: number; url: string; caption: string | null };

const SLIDE_MS = 5000;
/** Horizontal finger travel (px) that counts as a swipe. */
const SWIPE_PX = 50;

/**
 * Album photo grid plus a full-screen slideshow: arrows, keyboard (← → Esc,
 * space to play/pause), swipe on phones, autoplay. Each photo carries the
 * "who is in this photo?" form, open to every visitor and moderated in
 * /admin/galeria/sugestoes.
 */
export default function AlbumGallery({ photos, albumTitle }: { photos: Photo[]; albumTitle: string }) {
  const [current, setCurrent] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setCurrent(i)}
            className="group flex flex-col overflow-hidden rounded-xl border border-paper-200 bg-white text-left transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500"
            aria-label={`Ampliar foto ${i + 1} de ${photos.length}${photo.caption ? `: ${photo.caption}` : ""}`}
          >
            <span className="block aspect-square w-full overflow-hidden bg-paper-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- served from /api/uploads, not optimizable by next/image */}
              <img
                src={photo.url}
                alt={photo.caption ?? ""}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            {photo.caption ? (
              <span className="line-clamp-2 px-2 py-1.5 text-xs text-slate-500">{photo.caption}</span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1.5 text-xs text-accent-700">
                <MessageCirclePlus size={12} /> Sabe quem é?
              </span>
            )}
          </button>
        ))}
      </div>

      {current != null && (
        <Slideshow
          photos={photos}
          index={current}
          albumTitle={albumTitle}
          onChange={setCurrent}
          onClose={() => setCurrent(null)}
        />
      )}
    </>
  );
}

function Slideshow({
  photos,
  index,
  albumTitle,
  onChange,
  onClose,
}: {
  photos: Photo[];
  index: number;
  albumTitle: string;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const touchX = useRef<number | null>(null);
  const photo = photos[index];
  const many = photos.length > 1;

  const go = useCallback(
    (delta: number) => {
      setSuggesting(false);
      onChange(wrapIndex(index + delta, photos.length));
    },
    [index, onChange, photos.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Typing a suggestion must not flip photos.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") setSuggesting(false);
        return;
      }
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " && many) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, many]);

  // Autoplay pauses while the visitor is writing a suggestion.
  useEffect(() => {
    if (!playing || suggesting || !many) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, suggesting, many, go]);

  // No page scroll behind the overlay.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Preload the neighbours so the next slide shows at once.
  useEffect(() => {
    for (const d of [1, -1]) new Image().src = photos[wrapIndex(index + d, photos.length)].url;
  }, [index, photos]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${albumTitle} — foto ${index + 1} de ${photos.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-sm text-white/70">
          {albumTitle} · <span className="tabular-nums">{index + 1} de {photos.length}</span>
        </p>
        {many && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-white/10"
            title={playing ? "Pausar (espaço)" : "Apresentação automática (espaço)"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            <span className="hidden sm:inline">{playing ? "Pausar" : "Apresentação"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
          title="Fechar (Esc)"
          autoFocus
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served from /api/uploads, not optimizable by next/image */}
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption ?? ""}
          className="max-h-full max-w-full animate-[fadeIn_200ms_ease-out] object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {many && (
          <>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
          </>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-3 text-center" onClick={(e) => e.stopPropagation()}>
        {photo.caption ? (
          <p className="mx-auto max-w-3xl text-sm text-white/90">{photo.caption}</p>
        ) : (
          <p className="text-sm italic text-white/50">Ainda não sabemos quem ou o que aparece nesta foto.</p>
        )}
        {suggesting ? (
          <SuggestionForm key={photo.id} photoId={photo.id} onClose={() => setSuggesting(false)} />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setSuggesting(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-600"
          >
            <MessageCirclePlus size={14} />
            {photo.caption ? "Sabe mais sobre esta foto? Conte pra gente" : "Sabe quem é? Conte pra gente"}
          </button>
        )}
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex ${
        side === "left" ? "left-3" : "right-3"
      }`}
      title={side === "left" ? "Foto anterior (←)" : "Próxima foto (→)"}
    >
      <Icon size={26} />
    </button>
  );
}

function SuggestionForm({ photoId, onClose }: { photoId: number; onClose: () => void }) {
  const [state, action, pending] = useActionState<SuggestionActionState, FormData>(suggestPhotoCaptionAction, undefined);

  if (state?.success) {
    return (
      <p className="mt-2 text-sm text-green-300">
        {state.success}{" "}
        <button type="button" onClick={onClose} className="ml-2 text-white/60 underline">
          Fechar
        </button>
      </p>
    );
  }

  return (
    <form action={action} className="mx-auto mt-3 flex max-w-xl flex-col gap-2 text-left">
      <input type="hidden" name="photoId" value={photoId} />
      {/* Honeypot — hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <textarea
        name="suggestion"
        required
        rows={2}
        maxLength={500}
        autoFocus
        placeholder="Quem aparece, onde e quando foi? Ex.: meu avô José Motta, à esquerda, no desfile de 1954."
        className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="submitterName"
          type="text"
          maxLength={100}
          placeholder="Seu nome (opcional)"
          className="min-w-0 flex-1 rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar para revisão"}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10">
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-300">{state.error}</p>}
    </form>
  );
}
