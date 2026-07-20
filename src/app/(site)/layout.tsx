import AppShell from "@/components/AppShell";
import { getNewspaper, getNavigationTree } from "@/lib/data";
import { getSiteSettings } from "@/lib/settings";
import { generateBrandScale, BRAND_STEPS } from "@/lib/color";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [newspaper, tree, settings] = await Promise.all([
    getNewspaper(),
    getNavigationTree(),
    getSiteSettings(),
  ]);

  const scale = generateBrandScale(settings.primaryColor);
  const brandCssVars = BRAND_STEPS.map((step) => `--color-brand-${step}: ${scale[step]};`).join(
    " "
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root { ${brandCssVars} }` }} />
      <AppShell
        newspaperName={newspaper?.name ?? "Memorial do Jornal"}
        logoUrl={newspaper?.logoUrl}
        tree={tree}
        creditsText={settings.creditsText}
      >
        {children}
      </AppShell>
    </>
  );
}
