"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendMail, escapeHtml } from "@/lib/mailer";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactMessageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = await getClientIp();
  // 5 submissions per 10 minutes per IP — generous enough for a real visitor, tight enough against spam bots.
  if (!consumeRateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: "Muitas mensagens enviadas em pouco tempo. Tente novamente mais tarde." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Honeypot: a real visitor never fills this hidden field; a bot filling every field will.
  const honeypot = String(formData.get("website") ?? "").trim();

  if (honeypot) return { success: "Mensagem enviada com sucesso." };

  if (name.length < 2) return { error: "Informe seu nome." };
  if (!EMAIL_REGEX.test(email)) return { error: "Informe um email válido." };
  if (message.length < 10) return { error: "Escreva uma mensagem com pelo menos 10 caracteres." };

  const created = await prisma.contactMessage.create({
    data: { name, email, phone: phone || null, subject: subject || null, message },
  });

  let emailSent = false;
  try {
    const admin = await prisma.adminUser.findFirst({ orderBy: { id: "asc" } });
    if (admin) {
      await sendMail({
        to: admin.email,
        subject: `Fale Conosco — ${subject || "Nova mensagem"}`,
        html: `
          <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <p><strong>Mensagem:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      });
      emailSent = true;
    }
  } catch (err) {
    // Best-effort only — the message is already safely stored in the DB either way.
    console.error("Falha ao enviar email de notificação do formulário de contato:", err);
  }

  if (emailSent) {
    await prisma.contactMessage.update({ where: { id: created.id }, data: { emailSent: true } });
  }

  return { success: "Mensagem enviada com sucesso. Em breve entraremos em contato." };
}

export async function markMessageReadAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await prisma.contactMessage.updateMany({ where: { id }, data: { read: true } });

  revalidatePath("/admin/mensagens");
}

export async function deleteMessageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await prisma.contactMessage.deleteMany({ where: { id } });

  revalidatePath("/admin/mensagens");
}
