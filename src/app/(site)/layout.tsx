import AppShell from "@/components/AppShell";
import { getNewspaper, getSponsorsForPlacement, getPublishedMenuPages, getFooterLegalPages } from "@/lib/data";
import { getSiteSettings } from "@/lib/settings";
import { generateBrandScale, BRAND_STEPS } from "@/lib/color";
import { recordAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [newspaper, settings, footerSponsors, menuPages, legalPages] = await Promise.all([
    getNewspaper(),
    getSiteSettings(),
    getSponsorsForPlacement("FOOTER"),
    getPublishedMenuPages(),
    getFooterLegalPages(),
    recordAnalyticsEvent("SITE_VISIT"),
  ]);

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
        footerSponsors={footerSponsors}
        menuPages={menuPages}
        legalPages={legalPages}
        facebookUrl={settings.facebookUrl}
        instagramUrl={settings.instagramUrl}
        xUrl={settings.xUrl}
      >
        {children}
      </AppShell>
    </>
  );
}
