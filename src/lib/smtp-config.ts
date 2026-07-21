import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encryptSecret, decryptSecret } from "@/lib/db-config";

const CONFIG_PATH = path.join(process.cwd(), "config", "smtp-config.json");

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

type StoredSmtpConfig = Omit<SmtpConfig, "password"> & { passwordEncrypted: string };

export function readSmtpConfig(): SmtpConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredSmtpConfig;
  return {
    host: raw.host,
    port: raw.port,
    secure: raw.secure,
    user: raw.user,
    fromName: raw.fromName,
    fromEmail: raw.fromEmail,
    password: decryptSecret(raw.passwordEncrypted),
  };
}

export function writeSmtpConfig(config: SmtpConfig) {
  const stored: StoredSmtpConfig = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    passwordEncrypted: encryptSecret(config.password),
  };
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), "utf8");
}
