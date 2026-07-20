"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, reconnectPrisma, testDatabaseUrl } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  buildDatabaseUrl,
  readDbConfig,
  writeDbConfig,
  type DbConfig,
} from "@/lib/db-config";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

export async function updateDbConfigAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const host = String(formData.get("host") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const database = String(formData.get("database") ?? "").trim();
  const user = String(formData.get("user") ?? "").trim();
  const passwordRaw = String(formData.get("password") ?? "");

  const port = Number(portRaw || 3306);

  if (!host || !database || !user || !Number.isInteger(port) || port <= 0) {
    return { error: "Preencha host, porta, banco e usuário corretamente." };
  }

  let password = passwordRaw;
  if (!password) {
    const existing = readDbConfig();
    if (!existing) {
      return { error: "Informe a senha do banco (nenhuma configuração salva anteriormente)." };
    }
    password = existing.password;
  }

  const config: DbConfig = { host, port, database, user, password };
  const url = buildDatabaseUrl(config);

  const ok = await testDatabaseUrl(url);
  if (!ok) {
    return {
      error:
        "Não foi possível conectar ao banco com essas credenciais. Nada foi alterado — a conexão atual continua ativa.",
    };
  }

  writeDbConfig(config);
  await reconnectPrisma(url);

  revalidatePath("/admin/configuracoes");
  return { success: "Conexão testada com sucesso e aplicada imediatamente." };
}

export async function updateAppearanceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const creditsText = String(formData.get("creditsText") ?? "").trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return { error: "Escolha uma cor primária válida." };
  }
  if (creditsText.length < 1) {
    return { error: "O texto de créditos não pode ficar vazio." };
  }

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: { primaryColor, creditsText },
    create: { id: 1, primaryColor, creditsText },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/aparencia");
  return { success: "Aparência atualizada." };
}
