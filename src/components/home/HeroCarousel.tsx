"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export type HeroSlideData = {
  id: number;
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD_PX = 50;
// Slow zoom + drift on the active background ("Ken Burns"), long enough to
// still be moving through the 700ms crossfade out. Keyframes: globals.css.
const KEN_BURNS_MS = AUTOPLAY_MS + 1500;
// Drift direction per slide (cycled), so consecutive slides don't all move alike.
const KEN_BURNS_PANS: [string, string][] = [
  ["-2%", "-1.5%"],
  ["2%", "1.5%"],
  ["-2%", "1.5%"],
  ["2%", "-1.5%"],
];

/**
 * Crossfading hero carousel. All slides are stacked in the same place (the
 * text blocks share one grid cell, so the hero is as tall as the tallest
 * slide and never jumps). Autoplay pauses on hover/focus, via the pause
 * button, and is off entirely for prefers-reduced-motion users.
 * `aside` (the cover mockups) stays fixed while slides change.
 */
export default function HeroCarousel({ slides, aside }: { slides: HeroSlideData[]; aside?: ReactNode }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;
  const multiple = count > 1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // How many times each slide has become active — keys its <img> so the Ken
  // Burns zoom restarts on every activation.
  const [activations, setActivations] = useState<number[]>([]);

  const go = useCallback(
    (index: number) => {
      const next = ((index % count) + count) % count;
      setActive(next);
      setActivations((prev) => {
        const copy = [...prev];
        copy[next] = (copy[next] ?? 0) + 1;
        return copy;
      });
    },
    [count]
  );

  const autoplay = multiple && !paused && !hovering && !reducedMotion;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, active, go]);

  const fade = reducedMotion ? "" : "transition-opacity duration-700 ease-in-out";

  return (
    <div
      className="relative flex min-h-[440px] items-center overflow-hidden bg-brand-900 sm:min-h-[740px]"
      role={multiple ? "region" : undefined}
      aria-roledescription={multiple ? "carrossel" : undefined}
      aria-label={multiple ? "Destaques" : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovering(false);
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || !multiple) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(active + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((slide, i) => {
        if (!slide.imageUrl) return null;
        const [panX, panY] = KEN_BURNS_PANS[i % KEN_BURNS_PANS.length];
        return (
          // The wrapper owns the crossfade; the <img> inside owns the Ken Burns
          // zoom and is re-keyed each time its slide becomes active, so the
          // zoom restarts from scale(1) — while the outgoing slide keeps its
          // animation running through the fade instead of snapping back.
          <div
            key={slide.id}
            className={`absolute inset-0 ${fade} ${i === active ? "opacity-100" : "opacity-0"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={activations[i] ?? 0}
              src={slide.imageUrl}
              alt=""
              fetchPriority={i === 0 ? "high" : "low"}
              className="h-full w-full object-cover"
              style={
                reducedMotion
                  ? undefined
                  : ({
                      "--kb-x": panX,
                      "--kb-y": panY,
                      animation: multiple
                        ? `hero-ken-burns ${KEN_BURNS_MS}ms ease-out forwards`
                        : `hero-ken-burns 20s ease-in-out infinite alternate`,
                    } as CSSProperties)
              }
            />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900/85 via-brand-900/35 to-brand-900/10" />

      {aside && (
        // Anchored to the hero's bottom-right corner, pushed 15px below the
        // hero's bottom edge (clipped by the hero's overflow-hidden).
        <div className="pointer-events-none absolute bottom-[-15px] right-0 hidden h-[92%] w-[42%] lg:block">{aside}</div>
      )}

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        {/* On lg+ the text stays clear of the cover (right 42% of the hero). */}
        <div className={`grid max-w-xl flex-1 ${aside ? "lg:max-w-[min(36rem,57%)]" : ""}`}>
          {slides.map((slide, i) => {
            const isActive = i === active;
            const Heading = i === 0 ? "h1" : "h2";
            return (
              <div
                key={slide.id}
                role={multiple ? "group" : undefined}
                aria-roledescription={multiple ? "slide" : undefined}
                aria-label={multiple ? `${i + 1} de ${count}` : undefined}
                aria-hidden={!isActive}
                inert={!isActive}
                className={`[grid-area:1/1] ${fade} ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <Heading className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {slide.headline}
                </Heading>
                {slide.subtext && <p className="mt-4 text-sm text-white/80 sm:text-base">{slide.subtext}</p>}
                {slide.ctaLabel && slide.ctaHref && (
                  <Link
                    href={slide.ctaHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-700"
                  >
                    {slide.ctaLabel}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {multiple && (
        <>
          {/* Controls sit bottom-center, above the search panel (which overlaps
              the hero's bottom 40px) and clear of the cover mockups on the right. */}
          <div className="absolute inset-x-0 bottom-14 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => go(active - 1)}
              className="mr-1 hidden h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm hover:bg-black/45 sm:flex"
              aria-label="Slide anterior"
            >
              <ChevronLeft size={18} />
            </button>
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === active}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
            <button
              type="button"
              onClick={() => go(active + 1)}
              className="ml-1 hidden h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm hover:bg-black/45 sm:flex"
              aria-label="Próximo slide"
            >
              <ChevronRight size={18} />
            </button>
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Retomar troca automática" : "Pausar troca automática"}
                className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"
              >
                {paused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
