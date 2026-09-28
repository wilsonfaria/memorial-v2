"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Converts a YouTube/Vimeo watch URL into its embeddable iframe URL. Falls back to the raw URL for other hosts. */
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      // watch?v=ID, or /shorts/ID, /live/ID, /embed/ID
      const id =
        u.searchParams.get("v") ??
        (["shorts", "live", "embed"].includes(segments[0]) ? segments[1] : null);
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
    }
    if (u.hostname === "youtu.be" && segments[0]) {
      return `https://www.youtube.com/embed/${segments[0]}?autoplay=1`;
    }
    if (u.hostname.includes("vimeo.com")) {
      // vimeo.com/ID, vimeo.com/channels/x/ID, player.vimeo.com/video/ID
      const id = segments.findLast((s) => /^\d+$/.test(s));
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : url;
    }
    return url;
  } catch {
    return url;
  }
}

export default function MemoriaVivaBlock({
  title,
  subtitle,
  embedUrl,
  thumbnailUrl,
  buttonLabel,
}: {
  title: string;
  subtitle: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  buttonLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="memory-film relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-2xl bg-brand-900 p-6 text-white">
      {playing && embedUrl ? (
        <iframe
          src={toEmbedUrl(embedUrl)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <>
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <button
            type="button"
            onClick={() => setPlaying(true)}
            disabled={!embedUrl}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            title={embedUrl ? "Assistir" : "Vídeo não configurado"}
            aria-label={embedUrl ? `Assistir: ${title}` : "Vídeo não configurado"}
          >
            <Play size={26} className="ml-1" fill="currentColor" />
          </button>

          <div className="relative">
            <p className="home-eyebrow home-eyebrow-light">Vozes, imagens e lembranças</p>
            <h2 className="font-display text-2xl font-bold">{title}</h2>
            {subtitle && <p className="mt-2 max-w-sm text-sm text-white/80">{subtitle}</p>}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              disabled={!embedUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play size={13} fill="currentColor" />
              {buttonLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
