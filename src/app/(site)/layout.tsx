import AppShell from "@/components/AppShell";
import { getNewspaper } from "@/lib/data";
import { listMenuItems } from "@/lib/menu-repo";
import { getSiteSettings } from "@/lib/settings";
import { generateBrandScale, BRAND_STEPS } from "@/lib/color";
import { recordAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sponsor banners are fetched client-side per page view (SponsorBar)
  // so each navigation gets its own random selection and is counted.
  const [newspaper, settings, headerMenuItems, footerMenuItems] = await Promise.all([
    getNewspaper(),
    getSiteSettings(),
    listMenuItems("principal"),
    listMenuItems("rodape"),
  ]);
  // Fire-and-forget: analytics shouldn't hold up a DB connection needed for
  // the actual page render, or block the response on its own round-trip.
  void recordAnalyticsEvent("SITE_VISIT");

  const scale = generateBrandScale(settings.primaryColor);
  const accentScale = generateBrandScale(settings.accentColor);
  const secondaryScale = generateBrandScale(settings.secondaryColor);
  const supportScale = generateBrandScale(settings.supportColor);
  const cssVars = BRAND_STEPS.map(
    (step) =>
      `--color-brand-${step}: ${scale[step]}; --color-accent-${step}: ${accentScale[step]}; --color-secondary-${step}: ${secondaryScale[step]}; --color-support-${step}: ${supportScale[step]};`
  ).join(" ");
  const rootVars = `${cssVars} --background: ${settings.backgroundColor};`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root { ${rootVars} }` }} />
      <AppShell
        newspaperName={newspaper?.name ?? "Memorial do Jornal"}
        logoUrl={newspaper?.logoUrl}
        tagline={newspaper?.tagline ?? "Memorial digital do acervo"}
        creditsText={settings.creditsText}
        headerMenuItems={headerMenuItems}
        footerMenuItems={footerMenuItems}
        facebookUrl={settings.facebookUrl}
        instagramUrl={settings.instagramUrl}
        xUrl={settings.xUrl}
        youtubeUrl={settings.youtubeUrl}
        mastheadImageUrl={settings.mastheadImageUrl}
      >
        {children}
      </AppShell>
    </>
  );
}
