"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { readMeiliConfig, writeMeiliConfig, type MeiliConfig } from "@/lib/meili-config";
import { testMeiliCredentials } from "@/lib/search/meili";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

export async function updateMeiliConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const url = String(formData.get("url") ?? "").trim();
  const keyRaw = String(formData.get("key") ?? "").trim();

  if (!url) return { error: "Informe o endereço do Meilisearch." };

  let key = keyRaw;
  if (!key) {
    const existing = readMeiliConfig();
    if (!existing) return { error: "Informe a chave de API (nenhuma configuração salva anteriormente)." };
    key = existing.key;
  }

  const result = await testMeiliCredentials(url, key);
  if (!result.ok) {
    return { error: `Não foi possível confirmar o Meilisearch (${result.detail}). Nada foi alterado.` };
  }

  const config: MeiliConfig = { url, key };
  writeMeiliConfig(config);

  revalidatePath("/admin/chaves");
  revalidatePath("/admin/edicoes");
  return { success: "Meilisearch testado com sucesso e aplicado imediatamente." };
}
