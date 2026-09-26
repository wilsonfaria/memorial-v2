import { getSiteSettings } from "@/lib/settings";
import { getNewspaper } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import SiteIdentityForm from "./SiteIdentityForm";
import AppearanceForm from "./AppearanceForm";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [settings, newspaper] = await Promise.all([getSiteSettings(), getNewspaper()]);

  return (
    <>
      <PageHeader
        title="Aparência"
        description="Identidade visual do site: logo, nome, slogan, cores e rodapé. As mudanças refletem no site assim que salvas."
      />

      <div className="flex flex-col gap-6">
        <Card
          title="Identidade do site"
          description="Nome, slogan e logo exibidos no masthead e no rodapé."
        >
          <SiteIdentityForm
            initialName={newspaper?.name ?? ""}
            initialTagline={newspaper?.tagline ?? "Memorial digital do acervo"}
            initialLogoUrl={newspaper?.logoUrl ?? null}
          />
        </Card>

        <Card title="Tema" description="Paleta de cores, imagem do masthead, redes sociais e créditos do rodapé.">
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
            initialYoutubeUrl={settings.youtubeUrl ?? ""}
            initialMastheadImageUrl={settings.mastheadImageUrl}
          />
        </Card>
      </div>
    </>
  );
}
