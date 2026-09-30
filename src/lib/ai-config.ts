import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encryptSecret, decryptSecret } from "@/lib/db-config";
import { CONFIG_ROOT } from "@/lib/config-root";
import type { ProviderId } from "@/lib/ai-providers/types";

const CONFIG_PATH = path.join(CONFIG_ROOT, "ai-config.json");

export type AiConfig = {
  /** Which provider the transcription/extraction pipeline actually uses. */
  activeProvider: ProviderId;
  /** Per-provider overrides — all optional, falls back to env vars/spec defaults when absent. */
  overrides: Partial<
    Record<
      ProviderId,
      {
        apiKey?: string;
        models?: string[];
        extractModels?: string[];
      }
    >
  >;
};

type StoredAiConfig = {
  activeProvider: ProviderId;
  overrides: Partial<
    Record<
      ProviderId,
      {
        apiKeyEncrypted?: string;
        models?: string[];
        extractModels?: string[];
      }
    >
  >;
};

export function readAiConfig(): AiConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredAiConfig;
  const overrides: AiConfig["overrides"] = {};
  for (const [id, o] of Object.entries(raw.overrides)) {
    overrides[id as ProviderId] = {
      apiKey: o?.apiKeyEncrypted ? decryptSecret(o.apiKeyEncrypted) : undefined,
      models: o?.models,
      extractModels: o?.extractModels,
    };
  }
  return { activeProvider: raw.activeProvider, overrides };
}

export function writeAiConfig(config: AiConfig) {
  const existing = readAiConfig();
  const stored: StoredAiConfig = { activeProvider: config.activeProvider, overrides: {} };
  for (const id of Object.keys(config.overrides) as ProviderId[]) {
    const incoming = config.overrides[id];
    if (!incoming) continue;
    // Blank key in the form means "keep the current one" — never overwritten with nothing.
    const apiKey = incoming.apiKey || existing?.overrides[id]?.apiKey;
    stored.overrides[id] = {
      apiKeyEncrypted: apiKey ? encryptSecret(apiKey) : undefined,
      models: incoming.models,
      extractModels: incoming.extractModels,
    };
  }
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), "utf8");
}

export function getActiveProviderId(): ProviderId {
  return readAiConfig()?.activeProvider ?? "gemini";
}
