"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

export async function createMasterUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) {
    return { error: "Já existe um usuário administrador cadastrado." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (username.length < 3) {
    return { error: "O usuário deve ter ao menos 3 caracteres." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.adminUser.create({
    data: { username, passwordHash },
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

  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Usuário ou senha inválidos." };
  }

  await setSessionCookie({ sub: String(user.id), username: user.username });
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}
