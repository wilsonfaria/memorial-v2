import { getActiveProviderId, readAiConfig } from "@/lib/ai-config";
import { PROVIDER_SPECS, GEMINI_SPEC, GROQ_SPEC } from "./specs";
import * as engine from "./engine";
import type { ProviderId, ProviderSpec } from "./types";

export { DailyQuotaError, ModelBusyError, noRealError } from "./types";
export { GEMINI_SPEC, GROQ_SPEC, PROVIDER_SPECS };

function specFor(id: ProviderId): ProviderSpec {
  return id === "groq" ? GROQ_SPEC : GEMINI_SPEC;
}

/** Call after saving a provider's key/models in the admin — see engine.resetProviderState. */
export function resetProviderState(id: ProviderId): void {
  engine.resetProviderState(specFor(id));
}

function envApiKey(spec: ProviderSpec): string | undefined {
  return process.env[spec.apiKeyEnvVar] || undefined;
}

/** Saved override takes priority; falls back to the provider's env var. */
function resolveApiKey(spec: ProviderSpec): string | undefined {
  const override = readAiConfig()?.overrides[spec.id]?.apiKey;
  return override || envApiKey(spec);
}

function resolveModels(spec: ProviderSpec): string[] {
  const override = readAiConfig()?.overrides[spec.id]?.models;
  return override && override.length > 0 ? override : spec.defaultModels;
}

function resolveExtractModels(spec: ProviderSpec): string[] {
  const override = readAiConfig()?.overrides[spec.id]?.extractModels;
  return override && override.length > 0 ? override : spec.defaultExtractModels;
}

function activeSpec(): ProviderSpec {
  return specFor(getActiveProviderId());
}

/**
 * Semantic search always embeds with Gemini, whatever provider transcribes
 * (Groq has no embedding model) — so it needs the Gemini key specifically.
 */
export function geminiApiKey(): string | undefined {
  return resolveApiKey(GEMINI_SPEC);
}

export function isAiConfigured(): boolean {
  const spec = activeSpec();
  return Boolean(resolveApiKey(spec));
}

export function availableModels(): string[] {
  const spec = activeSpec();
  return engine.availableModels(spec, resolveModels(spec));
}

export function availableExtractModels(): string[] {
  const spec = activeSpec();
  return engine.availableModels(spec, resolveExtractModels(spec));
}

export function msUntilQuotaReset(): number {
  return activeSpec().msUntilQuotaReset();
}

export async function transcribeImage(jpeg: Buffer, instructions: string): Promise<{ text: string; model: string }> {
  const spec = activeSpec();
  const apiKey = resolveApiKey(spec);
  if (!apiKey) throw new Error(`${spec.label}: nenhuma chave de API configurada.`);
  const models = resolveModels(spec);
  // Distinguish "nothing to even try" from a real DailyQuotaError (which
  // implies every model *was* tried and ran out) — a provider picked as
  // active with no vision-capable model configured (e.g. Groq today) would
  // otherwise surface as a misleading "cota esgotada".
  if (models.length === 0) {
    throw new Error(
      `${spec.label} não tem modelo de transcrição (imagem) configurado${!spec.supportsVision ? " — este provedor não tem modelo com visão" : ""}.`
    );
  }
  return engine.transcribeImage(spec, apiKey, models, jpeg, instructions);
}

export async function generateJson(prompt: string): Promise<{ json: unknown; model: string }> {
  const spec = activeSpec();
  const apiKey = resolveApiKey(spec);
  if (!apiKey) throw new Error(`${spec.label}: nenhuma chave de API configurada.`);
  const models = resolveExtractModels(spec);
  if (models.length === 0) throw new Error(`${spec.label} não tem modelo de extração (texto) configurado.`);
  return engine.generateJson(spec, apiKey, models, prompt);
}

/** One real, cheap call to confirm a key/model actually works — used before saving. */
export async function testProvider(id: ProviderId, apiKey: string, model?: string): Promise<void> {
  const spec = specFor(id);
  const fallback = spec.defaultModels[0] ?? spec.defaultExtractModels[0];
  if (!model && !fallback) throw new Error(`${spec.label}: nenhum modelo configurado para testar.`);
  await engine.pingProvider(spec, apiKey, model || fallback);
}

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  active: boolean;
  configured: boolean;
  usingOverrideKey: boolean;
  supportsVision: boolean;
  models: string[];
  extractModels: string[];
};

/** Snapshot for the admin panel: every known provider, not just the active one. */
export function getProviderStatuses(): ProviderStatus[] {
  const activeId = getActiveProviderId();
  return PROVIDER_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    active: spec.id === activeId,
    supportsVision: spec.supportsVision,
    configured: Boolean(resolveApiKey(spec)),
    usingOverrideKey: Boolean(readAiConfig()?.overrides[spec.id]?.apiKey),
    models: resolveModels(spec),
    extractModels: resolveExtractModels(spec),
  }));
}
