"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SponsorBar from "@/components/SponsorBar";
import { EditionModalProvider } from "@/context/EditionModalContext";
import type { PublicMenuItem } from "@/lib/menu-repo";

// pdfjs touches browser-only globals (DOMMatrix) at module load time,
// so this must never be evaluated during server-side rendering.
const EditionModal = dynamic(() => import("@/components/EditionModal"), { ssr: false });

export default function AppShell({
  newspaperName,
  logoUrl,
  tagline,
  creditsText,
  headerMenuItems,
  footerMenuItems,
  facebookUrl,
  instagramUrl,
  xUrl,
  youtubeUrl,
  mastheadImageUrl,
  children,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  creditsText: string;
  headerMenuItems: PublicMenuItem[];
  footerMenuItems: PublicMenuItem[];
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
  mastheadImageUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <EditionModalProvider>
      <div className="memorial-site flex min-h-screen flex-col">
        <Header
          newspaperName={newspaperName}
          logoUrl={logoUrl}
          tagline={tagline}
          menuItems={headerMenuItems}
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          xUrl={xUrl}
          youtubeUrl={youtubeUrl}
          mastheadImageUrl={mastheadImageUrl}
        />
        <main className="flex flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <SponsorBar />
          <Footer
            newspaperName={newspaperName}
            logoUrl={logoUrl}
            tagline={tagline}
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            xUrl={xUrl}
            youtubeUrl={youtubeUrl}
            menuItems={footerMenuItems}
            creditsText={creditsText}
          />
        </main>
      </div>
      <EditionModal />
    </EditionModalProvider>
  );
}
