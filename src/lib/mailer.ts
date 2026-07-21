import nodemailer from "nodemailer";
import { readSmtpConfig, type SmtpConfig } from "@/lib/smtp-config";

export function buildTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
}

export async function testSmtpConfig(config: SmtpConfig): Promise<boolean> {
  try {
    await buildTransport(config).verify();
    return true;
  } catch {
    return false;
  }
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const config = readSmtpConfig();
  if (!config) throw new Error("SMTP não configurado em /admin/configuracoes.");

  const transport = buildTransport(config);
  await transport.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
