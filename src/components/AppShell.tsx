"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CreditsButton from "@/components/CreditsButton";
import SponsorFooterCarousel from "@/components/SponsorFooterCarousel";
import { EditionModalProvider } from "@/context/EditionModalContext";
import type { MenuPage } from "@/lib/data";

type SponsorSummary = { id: number; name: string; logoUrl: string; linkUrl: string | null };
type LegalPage = { slug: string; label: string };

// pdfjs touches browser-only globals (DOMMatrix) at module load time,
// so this must never be evaluated during server-side rendering.
const EditionModal = dynamic(() => import("@/components/EditionModal"), { ssr: false });

export default function AppShell({
  newspaperName,
  logoUrl,
  tagline,
  creditsText,
  footerSponsors,
  menuPages,
  legalPages,
  facebookUrl,
  instagramUrl,
  xUrl,
  children,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  creditsText: string;
  footerSponsors: SponsorSummary[];
  menuPages: MenuPage[];
  legalPages: LegalPage[];
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <EditionModalProvider>
      <div className="flex h-full flex-col">
        <Header newspaperName={newspaperName} logoUrl={logoUrl} tagline={tagline} menuPages={menuPages} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex-1">{children}</div>
          <SponsorFooterCarousel sponsors={footerSponsors} />
          <Footer
            newspaperName={newspaperName}
            logoUrl={logoUrl}
            creditsText={creditsText}
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            xUrl={xUrl}
            legalPages={legalPages}
          />
        </main>
      </div>
      <EditionModal />
      <CreditsButton text={creditsText} />
    </EditionModalProvider>
  );
}
