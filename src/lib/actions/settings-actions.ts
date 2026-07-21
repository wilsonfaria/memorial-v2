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
import { readSmtpConfig, writeSmtpConfig, type SmtpConfig } from "@/lib/smtp-config";
import { testSmtpConfig } from "@/lib/mailer";

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

  const backgroundColor = String(formData.get("backgroundColor") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const accentColor = String(formData.get("accentColor") ?? "").trim();
  const secondaryColor = String(formData.get("secondaryColor") ?? "").trim();
  const supportColor = String(formData.get("supportColor") ?? "").trim();
  const creditsText = String(formData.get("creditsText") ?? "").trim();
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim() || null;
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim() || null;
  const xUrl = String(formData.get("xUrl") ?? "").trim() || null;

  if (!/^#[0-9a-fA-F]{6}$/.test(backgroundColor)) {
    return { error: "Escolha uma cor de fundo válida." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return { error: "Escolha uma cor primária válida." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return { error: "Escolha uma cor de destaque válida." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(secondaryColor)) {
    return { error: "Escolha uma cor secundária válida." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(supportColor)) {
    return { error: "Escolha uma cor de apoio válida." };
  }
  if (creditsText.length < 1) {
    return { error: "O texto do rodapé não pode ficar vazio." };
  }

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: { backgroundColor, primaryColor, accentColor, secondaryColor, supportColor, creditsText, facebookUrl, instagramUrl, xUrl },
    create: { id: 1, backgroundColor, primaryColor, accentColor, secondaryColor, supportColor, creditsText, facebookUrl, instagramUrl, xUrl },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/aparencia");
  return { success: "Aparência atualizada." };
}

export async function updateSmtpConfigAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const host = String(formData.get("host") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const secure = formData.get("secure") === "on";
  const user = String(formData.get("user") ?? "").trim();
  const passwordRaw = String(formData.get("password") ?? "");
  const fromName = String(formData.get("fromName") ?? "").trim();
  const fromEmail = String(formData.get("fromEmail") ?? "").trim();

  const port = Number(portRaw || 587);

  if (!host || !user || !fromName || !fromEmail || !Number.isInteger(port) || port <= 0) {
    return { error: "Preencha host, porta, usuário, remetente e email do remetente corretamente." };
  }

  let password = passwordRaw;
  if (!password) {
    const existing = readSmtpConfig();
    if (!existing) {
      return { error: "Informe a senha do SMTP (nenhuma configuração salva anteriormente)." };
    }
    password = existing.password;
  }

  const config: SmtpConfig = { host, port, secure, user, password, fromName, fromEmail };

  const ok = await testSmtpConfig(config);
  if (!ok) {
    return {
      error: "Não foi possível conectar/autenticar no servidor SMTP com essas credenciais. Nada foi salvo.",
    };
  }

  writeSmtpConfig(config);

  revalidatePath("/admin/configuracoes");
  return { success: "Conexão SMTP testada com sucesso e salva." };
}
