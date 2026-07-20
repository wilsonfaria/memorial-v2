import { getSiteSettings } from "@/lib/settings";
import AppearanceForm from "./AppearanceForm";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Aparência</h1>

      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <AppearanceForm initialColor={settings.primaryColor} initialCreditsText={settings.creditsText} />
      </div>
    </div>
  );
}
