import { getSiteSettings } from "@/lib/settings";
import { getNewspaper } from "@/lib/data";
import SiteIdentityForm from "./SiteIdentityForm";
import AppearanceForm from "./AppearanceForm";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [settings, newspaper] = await Promise.all([getSiteSettings(), getNewspaper()]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-xl font-semibold text-brand-900">Aparência</h1>
      <p className="mb-6 text-sm text-slate-500">
        Personalize a identidade visual do site: logo, nome, slogan, cores e rodapé — como em um
        painel de personalização de tema. As mudanças refletem no site assim que salvas.
      </p>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Identidade do site
      </h2>
      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <SiteIdentityForm
          initialName={newspaper?.name ?? ""}
          initialTagline={newspaper?.tagline ?? "Memorial digital do acervo"}
          initialLogoUrl={newspaper?.logoUrl ?? null}
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Tema
      </h2>
      <div className="rounded-xl border border-paper-200 bg-white p-4">
        <AppearanceForm
          initialBackgroundColor={settings.backgroundColor}
          initialColor={settings.primaryColor}
          initialAccentColor={settings.accentColor}
          initialSecondaryColor={settings.secondaryColor}
          initialSupportColor={settings.supportColor}
          initialCreditsText={settings.creditsText}
          initialFacebookUrl={settings.facebookUrl ?? ""}
          initialInstagramUrl={settings.instagramUrl ?? ""}
          initialXUrl={settings.xUrl ?? ""}
        />
      </div>
    </div>
  );
}
