import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encryptSecret, decryptSecret } from "@/lib/db-config";
import { CONFIG_ROOT } from "@/lib/config-root";

const CONFIG_PATH = path.join(CONFIG_ROOT, "meili-config.json");

export type MeiliConfig = { url: string; key: string };

type StoredMeiliConfig = { url: string; keyEncrypted: string };

export function readMeiliConfig(): MeiliConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredMeiliConfig;
  return { url: raw.url, key: decryptSecret(raw.keyEncrypted) };
}

export function writeMeiliConfig(config: MeiliConfig) {
  const stored: StoredMeiliConfig = { url: config.url, keyEncrypted: encryptSecret(config.key) };
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), "utf8");
}
