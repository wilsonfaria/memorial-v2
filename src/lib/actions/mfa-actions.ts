"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword } from "@/lib/auth";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateBackupCodes,
  generateMfaSecret,
  getProvisioningQrCodeDataUrl,
  verifyTotpToken,
} from "@/lib/mfa";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string; backupCodes?: string[] } | undefined;

/** Generates a new secret and stores it (mfaEnabled stays false until confirmMfaEnrollmentAction succeeds). */
export async function startMfaEnrollmentAction(): Promise<
  { secret: string; qrCodeDataUrl: string } | { error: string }
> {
  const session = await requireSession();
  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user) return { error: "Usuário não encontrado." };

  const secret = generateMfaSecret();
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false, mfaBackupCodes: null },
  });

  const qrCodeDataUrl = await getProvisioningQrCodeDataUrl(secret, user.email);
  return { secret, qrCodeDataUrl };
}

export async function confirmMfaEnrollmentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user?.mfaSecret) {
    return { error: "Inicie a configuração da verificação em duas etapas novamente." };
  }

  const secret = decryptMfaSecret(user.mfaSecret);
  if (!code || !verifyTotpToken(secret, code)) {
    return { error: "Código inválido. Confira o horário do seu dispositivo e tente de novo." };
  }

  const { codes, hashes } = generateBackupCodes();
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { mfaEnabled: true, mfaBackupCodes: JSON.stringify(hashes) },
  });

  // Deliberately no revalidatePath here: the parent page swaps this whole
  // enrollment card out for the "MFA enabled" view based on mfaEnabled, and
  // we need the backup codes to stay on screen until the user acknowledges
  // them. EnrollMfaCard's "Concluir" button triggers the refresh instead.
  return { success: "Verificação em duas etapas ativada com sucesso.", backupCodes: codes };
}

export async function disableMfaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Senha incorreta." };
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null },
  });

  revalidatePath("/admin/seguranca");
  return { success: "Verificação em duas etapas desativada." };
}

export async function regenerateBackupCodesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.adminUser.findUnique({ where: { id: Number(session.sub) } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Senha incorreta." };
  }
  if (!user.mfaEnabled) {
    return { error: "A verificação em duas etapas não está ativada." };
  }

  const { codes, hashes } = generateBackupCodes();
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { mfaBackupCodes: JSON.stringify(hashes) },
  });

  revalidatePath("/admin/seguranca");
  return { success: "Novos códigos de backup gerados.", backupCodes: codes };
}
