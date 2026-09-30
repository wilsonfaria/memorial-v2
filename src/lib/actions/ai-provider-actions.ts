"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { readAiConfig, writeAiConfig, type AiConfig } from "@/lib/ai-config";
import { testProvider, PROVIDER_SPECS } from "@/lib/ai-providers/registry";
import type { ProviderId } from "@/lib/ai-providers/types";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

function splitModels(raw: string): string[] {
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Saves the active provider + any per-provider overrides. Tests the *active*
 * provider's effective key/model with one real, cheap call before writing
 * anything — same "never accept blindly" rule as the DB/SMTP config screens.
 */
export async function updateAiProviderAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const activeProvider = String(formData.get("activeProvider") ?? "") as ProviderId;
  if (!PROVIDER_SPECS.some((s) => s.id === activeProvider)) {
    return { error: "Selecione um provedor válido." };
  }

  const existing = readAiConfig();
  const overrides: AiConfig["overrides"] = { ...existing?.overrides };

  for (const spec of PROVIDER_SPECS) {
    const apiKeyRaw = String(formData.get(`${spec.id}_apiKey`) ?? "").trim();
    const modelsRaw = String(formData.get(`${spec.id}_models`) ?? "").trim();
    const extractModelsRaw = String(formData.get(`${spec.id}_extractModels`) ?? "").trim();
    const current = overrides[spec.id];
    overrides[spec.id] = {
      apiKey: apiKeyRaw || current?.apiKey, // blank = keep whatever was saved before
      models: modelsRaw ? splitModels(modelsRaw) : current?.models,
      extractModels: extractModelsRaw ? splitModels(extractModelsRaw) : current?.extractModels,
    };
  }

  // Test the provider that's about to become active, with its effective key/model.
  const activeSpec = PROVIDER_SPECS.find((s) => s.id === activeProvider)!;
  const effectiveKey = overrides[activeProvider]?.apiKey || process.env[activeSpec.apiKeyEnvVar];
  if (!effectiveKey) {
    return {
      error: `Informe uma chave de API para ${activeSpec.label} (nesta tela ou na variável de ambiente ${activeSpec.apiKeyEnvVar}) antes de ativá-lo.`,
    };
  }
  const testModel =
    overrides[activeProvider]?.models?.[0] ??
    activeSpec.defaultModels[0] ??
    overrides[activeProvider]?.extractModels?.[0] ??
    activeSpec.defaultExtractModels[0];
  try {
    await testProvider(activeProvider, effectiveKey, testModel);
  } catch (err) {
    return {
      error: `Não foi possível confirmar ${activeSpec.label} com essas credenciais (${(err as Error).message.slice(0, 200)}). Nada foi alterado.`,
    };
  }

  writeAiConfig({ activeProvider, overrides });

  revalidatePath("/admin/edicoes");
  return { success: `${activeSpec.label} testado com sucesso e definido como provedor ativo.` };
}
