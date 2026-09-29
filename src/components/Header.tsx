"use client";

import type { PointerEvent } from "react";
import Link from "next/link";
import type { PublicMenuItem } from "@/lib/menu-repo";
import { QuillIcon } from "@/components/icons";
import SocialLinks from "@/components/SocialLinks";
import AccessibilityBar from "@/components/AccessibilityBar";
import MainNavigation from "@/components/MainNavigation";

export default function Header({
  newspaperName,
  logoUrl,
  tagline,
  menuItems,
  facebookUrl,
  instagramUrl,
  xUrl,
  youtubeUrl,
  mastheadImageUrl,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  menuItems: PublicMenuItem[];
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
  mastheadImageUrl?: string | null;
}) {
  function moveMasthead(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--masthead-x", `${(x - 0.5) * 18}px`);
    event.currentTarget.style.setProperty("--masthead-y", `${(y - 0.5) * 10}px`);
    event.currentTarget.style.setProperty("--masthead-light-x", `${x * 100}%`);
  }

  function resetMasthead(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--masthead-x", "0px");
    event.currentTarget.style.setProperty("--masthead-y", "0px");
    event.currentTarget.style.setProperty("--masthead-light-x", "50%");
  }

  return (
    <header className="memorial-header w-full">
      {/* Top utility bar */}
      <div className="hidden bg-slate-800 px-4 py-1.5 sm:px-6 lg:block lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SocialLinks
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            xUrl={xUrl}
            youtubeUrl={youtubeUrl}
            className="text-white/60"
          />
          <AccessibilityBar />
        </div>
      </div>

      {/* Masthead */}
      <div
        className="memorial-masthead relative flex min-h-[180px] items-center bg-paper-50 px-4 py-4 sm:px-6 lg:px-8"
        onPointerMove={moveMasthead}
        onPointerLeave={resetMasthead}
      >
        <span className="masthead-scenery" aria-hidden="true">
          <span style={mastheadImageUrl ? { backgroundImage: `url(${mastheadImageUrl})` } : undefined} />
        </span>
        <span className="masthead-glow" aria-hidden="true" />
        <div className="masthead-content mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="masthead-values hidden shrink-0 text-xs font-semibold uppercase leading-tight tracking-wide text-brand-700 sm:block">
            <span>História</span>
            <span>Cultura</span>
            <span>Memória</span>
            <span>Identidade</span>
          </div>

          <Link href="/" className="masthead-brand flex min-w-0 flex-1 items-center justify-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${newspaperName}`}
                className="h-auto w-full max-w-[445px] object-contain"
              />
            ) : (
              <>
                <QuillIcon className="h-[48px] w-[48px] shrink-0 text-brand-900" />
                <div className="flex min-w-0 flex-col items-center leading-tight">
                  <span className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <span className="h-px w-[34px] bg-slate-300" />
                    Memorial do Jornal
                    <span className="h-px w-[34px] bg-slate-300" />
                  </span>
                  <span className="truncate font-display text-[30px] font-bold text-brand-900 sm:text-[41px]">
                    {newspaperName}
                  </span>
                  <span className="truncate text-[12px] uppercase tracking-wide text-slate-500">{tagline}</span>
                </div>
              </>
            )}
          </Link>

          <div className="masthead-legacy hidden shrink-0 items-center gap-4 lg:flex">
            <div className="text-right leading-tight">
              <p className="font-display text-3xl font-bold text-brand-900">105 ANOS</p>
              <p className="text-sm text-slate-500">de história viva</p>
            </div>
            <span className="h-12 w-px bg-slate-300" />
            <div className="max-w-[11rem] text-right text-sm leading-tight text-slate-500">
              <p className="italic">Preservar o passado</p>
              <p className="italic">é construir o futuro.</p>
            </div>
          </div>
        </div>
      </div>

      <MainNavigation items={menuItems} />
    </header>
  );
}
