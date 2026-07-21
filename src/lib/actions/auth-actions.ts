"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  clearMfaPendingCookie,
  clearSessionCookie,
  generatePasswordResetToken,
  getMfaPendingUserId,
  getSession,
  hashPassword,
  hashPasswordResetToken,
  setMfaPendingCookie,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { sendMail, escapeHtml } from "@/lib/mailer";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { decryptMfaSecret, verifyBackupCode, verifyTotpToken } from "@/lib/mfa";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

const RESET_TOKEN_DURATION_MS = 1000 * 60 * 60; // 1 hour

const LOGIN_LIMIT_PER_USERNAME = 8;
const LOGIN_LIMIT_PER_IP = 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const RESET_LIMIT_PER_EMAIL = 3;
const RESET_LIMIT_PER_IP = 15;
const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const TOO_MANY_ATTEMPTS_ERROR = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

const MFA_VERIFY_LIMIT_PER_USER = 8;
const MFA_VERIFY_LIMIT_PER_IP = 30;
const MFA_VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function createMasterUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) {
    return { error: "Já existe um usuário administrador cadastrado." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (name.length < 2) {
    return { error: "Informe o nome do administrador." };
  }
  if (username.length < 3) {
    return { error: "O usuário deve ter ao menos 3 caracteres." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um email válido." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.adminUser.create({
    data: { name, username, email, passwordHash },
  });

  await setSessionCookie({ sub: String(user.id), username: user.username });
  redirect("/admin");
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const ip = await getClientIp();
  const ipOk = consumeRateLimit(`login:ip:${ip}`, LOGIN_LIMIT_PER_IP, LOGIN_WINDOW_MS);
  const userOk = consumeRateLimit(
    `login:user:${username.toLowerCase()}`,
    LOGIN_LIMIT_PER_USERNAME,
    LOGIN_WINDOW_MS
  );
  if (!ipOk || !userOk) {
    return { error: TOO_MANY_ATTEMPTS_ERROR };
  }

  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Usuário ou senha inválidos." };
  }

  if (user.mfaEnabled) {
    await setMfaPendingCookie(String(user.id));
    redirect("/admin/verificar-mfa");
  }

  await setSessionCookie({ sub: String(user.id), username: user.username });
  redirect("/admin");
}

export async function verifyMfaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getMfaPendingUserId();
  if (!userId) {
    return { error: "Sessão de login expirada. Faça login novamente." };
  }

  const ip = await getClientIp();
  const ipOk = consumeRateLimit(`mfa:ip:${ip}`, MFA_VERIFY_LIMIT_PER_IP, MFA_VERIFY_WINDOW_MS);
  const userOk = consumeRateLimit(`mfa:user:${userId}`, MFA_VERIFY_LIMIT_PER_USER, MFA_VERIFY_WINDOW_MS);
  if (!ipOk || !userOk) {
    return { error: TOO_MANY_ATTEMPTS_ERROR };
  }

  const code = String(formData.get("code") ?? "").trim();
  const user = await prisma.adminUser.findUnique({ where: { id: Number(userId) } });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    await clearMfaPendingCookie();
    redirect("/admin/login");
  }

  const secret = decryptMfaSecret(user.mfaSecret);
  let valid = code.length > 0 && verifyTotpToken(secret, code);

  if (!valid && user.mfaBackupCodes) {
    const remaining = verifyBackupCode(code, user.mfaBackupCodes);
    if (remaining) {
      valid = true;
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { mfaBackupCodes: JSON.stringify(remaining) },
      });
    }
  }

  if (!valid) {
    return { error: "Código inválido." };
  }

  await clearMfaPendingCookie();
  await setSessionCookie({ sub: String(user.id), username: user.username });
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function createUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Informe o nome do usuário." };
  if (username.length < 3) return { error: "O usuário deve ter ao menos 3 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um email válido." };
  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };

  const existing = await prisma.adminUser.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return { error: "Já existe um usuário com esse nome de usuário ou email." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({ data: { name, username, email, passwordHash } });

  revalidatePath("/admin/usuarios");
  return { success: "Usuário criado com sucesso." };
}

export async function updateUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (name.length < 2) return { error: "Informe o nome do usuário." };
  if (username.length < 3) return { error: "O usuário deve ter ao menos 3 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um email válido." };

  const conflict = await prisma.adminUser.findFirst({
    where: { id: { not: id }, OR: [{ username }, { email }] },
  });
  if (conflict) {
    return { error: "Já existe outro usuário com esse nome de usuário ou email." };
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: { name, username, email },
  });

  if (String(user.id) === session.sub) {
    await setSessionCookie({ sub: String(user.id), username: user.username });
  }

  revalidatePath("/admin/usuarios");
  return { success: "Usuário atualizado com sucesso." };
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireSession();
  const id = Number(formData.get("id"));

  if (String(id) === session.sub) {
    return;
  }

  const totalUsers = await prisma.adminUser.count();
  if (totalUsers <= 1) {
    return;
  }

  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const genericSuccess = {
    success: "Se existir uma conta com esse email, enviamos um link de redefinição de senha.",
  };

  if (!email) return { error: "Informe um email." };

  const ip = await getClientIp();
  const ipOk = consumeRateLimit(`reset:ip:${ip}`, RESET_LIMIT_PER_IP, RESET_WINDOW_MS);
  const emailOk = consumeRateLimit(
    `reset:email:${email.toLowerCase()}`,
    RESET_LIMIT_PER_EMAIL,
    RESET_WINDOW_MS
  );
  if (!ipOk || !emailOk) {
    // Same generic message — don't reveal that rate limiting kicked in specifically.
    return genericSuccess;
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    // Do not reveal whether the email exists.
    return genericSuccess;
  }

  const { rawToken, tokenHash } = generatePasswordResetToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
    },
  });

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/admin/redefinir-senha/${rawToken}`;

  try {
    await sendMail({
      to: user.email,
      subject: "Redefinição de senha — Memorial do Jornal",
      html: `
        <p>Olá, ${escapeHtml(user.name)}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha de acesso à administração do Memorial do Jornal.</p>
        <p><a href="${resetUrl}">Clique aqui para definir uma nova senha</a> (o link expira em 1 hora).</p>
        <p>Se você não solicitou isso, ignore este email.</p>
      `,
    });
  } catch {
    return {
      error:
        "Não foi possível enviar o email agora. Verifique a configuração de SMTP em Configurações.",
    };
  }

  return genericSuccess;
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Este link de redefinição é inválido ou expirou. Solicite um novo." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: "Senha redefinida com sucesso. Você já pode entrar com a nova senha." };
}
