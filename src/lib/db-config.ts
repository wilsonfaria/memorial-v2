import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG_ROOT } from "@/lib/config-root";

const CONFIG_PATH = path.join(CONFIG_ROOT, "db-config.json");

export type DbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

type StoredDbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordEncrypted: string;
};

function getEncryptionKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) throw new Error("SETTINGS_ENCRYPTION_KEY não configurado no ambiente");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function readDbConfig(): DbConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredDbConfig;
  return {
    host: raw.host,
    port: raw.port,
    database: raw.database,
    user: raw.user,
    password: decryptSecret(raw.passwordEncrypted),
  };
}

export function writeDbConfig(config: DbConfig) {
  const stored: StoredDbConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    passwordEncrypted: encryptSecret(config.password),
  };
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), "utf8");
}

export function buildDatabaseUrl(config: DbConfig): string {
  const auth = `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}`;
  return `mysql://${auth}@${config.host}:${config.port}/${encodeURIComponent(config.database)}`;
}

function parseDatabaseUrl(url: string): DbConfig | null {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      database: parsed.pathname.replace(/^\//, ""),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

/** Current effective config: saved file takes priority, falls back to env DATABASE_URL. */
export function getEffectiveDbConfig(): DbConfig | null {
  return readDbConfig() ?? (process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null);
}

export function getDatabaseUrl(): string {
  const fromFile = readDbConfig();
  if (fromFile) return buildDatabaseUrl(fromFile);

  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) throw new Error("DATABASE_URL não configurado e nenhuma configuração salva encontrada");
  return envUrl;
}
