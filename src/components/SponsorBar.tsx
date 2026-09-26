"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PublicBanner } from "@/lib/banners";

/**
 * Sponsor banner bar above the footer, on every page (mounted once in
 * AppShell). On each page view (pathname change) it asks the server for a
 * fresh selection — pinned first, the rest randomized, appearances counted
 * server-side — and reports one *view* when the strip actually comes on
 * screen. Clicks go through /api/banners/[id]/click to be counted.
 * See src/lib/banners.ts.
 */
export default function SponsorBar() {
  const pathname = usePathname();
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  // Guards against double counting: React dev StrictMode runs effects twice
  // on the same instance, and refs survive that.
  const fetchedFor = useRef<string | null>(null);
  const viewedFor = useRef<string | null>(null);
  const [selectionPath, setSelectionPath] = useState<string | null>(null);

  useEffect(() => {
    if (fetchedFor.current === pathname) return;
    fetchedFor.current = pathname;
    fetch("/api/banners/view", { method: "POST" })
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: PublicBanner[] }) => {
        // Ignore a late answer if the visitor already moved to another page.
        if (fetchedFor.current !== pathname) return;
        setBanners(data.banners);
        setSelectionPath(pathname);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || banners.length === 0 || !selectionPath || viewedFor.current === selectionPath) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || viewedFor.current === selectionPath) return;
        viewedFor.current = selectionPath;
        observer.disconnect();
        void fetch("/api/banners/seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: banners.map((b) => b.id) }),
          keepalive: true,
        }).catch(() => {});
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [banners, selectionPath]);

  if (banners.length === 0) return null;

  // Static bar (the former homepage "Nossos Patrocinadores" design): label on
  // the left, the selected logos side by side. 15px gap above the footer;
  // py-[34px] = the original py-6 plus 20px of height.
  return (
    <section
      ref={stripRef}
      aria-label="Patrocinadores"
      className="mb-[15px] mt-8 shrink-0 border-y border-paper-200 bg-paper-50"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-[34px] sm:px-6 lg:px-8">
        <p className="shrink-0 text-base font-bold uppercase leading-tight tracking-wide text-brand-900">
          Nossos
          <br />
          Patrocinadores
        </p>
        <span className="hidden h-14 w-px bg-paper-200 sm:block" />

        <div className="flex flex-1 flex-wrap items-center gap-8">
          {banners.map((banner) => (
            <BannerLogo key={banner.id} banner={banner} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BannerLogo({ banner }: { banner: PublicBanner }) {
  // eslint-disable-next-line @next/next/no-img-element
  const logo = <img src={banner.logoUrl} alt={banner.name} className="h-[55px] w-auto object-contain" />;

  return banner.hasLink ? (
    <a href={`/api/banners/${banner.id}/click`} target="_blank" rel="noopener sponsored">
      {logo}
    </a>
  ) : (
    <span>{logo}</span>
  );
}
