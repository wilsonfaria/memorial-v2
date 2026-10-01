"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPipelineStatuses,
  getPipelineTotals,
  pickEditions,
  resetRevision,
  runPipelineStep,
  type PickCriterion,
  type PipelineStage,
} from "@/lib/pipeline";
import { getWorkerState, wakeWorker } from "@/lib/ocr-revision/worker";
import { countPendingEmbeddings } from "@/lib/search/embed-pages";
import { isEmbeddingConfigured } from "@/lib/search/embeddings";
import { getRevisionStats } from "@/lib/ocr-revision/revise";
import { countPendingExtraction } from "@/lib/entities/extract";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

const STAGES: PipelineStage[] = ["extract", "revise", "index"];

/** One short step for one edition (see runPipelineStep) — the browser loops over these. */
export async function pipelineStepAction(editionId: number, stage: PipelineStage) {
  await requireSession();
  if (!STAGES.includes(stage)) return { ok: false as const, stage, detail: "Etapa inválida." };
  return runPipelineStep(Number(editionId), stage);
}

export async function pipelineStatusAction(editionIds: number[]) {
  await requireSession();
  return getPipelineStatuses(editionIds.map(Number).filter(Number.isInteger).slice(0, 100));
}

/** Human names for the run log ("Edição nº 1329"), instead of database ids. */
export async function editionLabelsAction(editionIds: number[]): Promise<Record<number, string>> {
  await requireSession();
  const ids = editionIds.map(Number).filter(Number.isInteger).slice(0, 100);
  const rows = await prisma.edition.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, editionNumber: true },
  });
  return Object.fromEntries(rows.map((e) => [e.id, e.editionNumber != null ? `Edição nº ${e.editionNumber}` : e.title]));
}

export async function pipelineTotalsAction() {
  await requireSession();
  return getPipelineTotals();
}

export async function resetRevisionAction(editionId: number, onlyFailed: boolean) {
  await requireSession();
  const n = await resetRevision(Number(editionId), Boolean(onlyFailed));
  return { count: n };
}

export async function pickEditionsAction(criterion: PickCriterion, count: number, order: "sequential" | "random") {
  await requireSession();
  if (!["no-text", "ai-pending", "ai-errors"].includes(criterion)) return [];
  return pickEditions(criterion, Number(count) || 1, order === "random" ? "random" : "sequential");
}

/** Called once a run finishes so the server-rendered list/badges refresh. */
export async function pipelineDoneAction() {
  await requireSession();
  revalidatePath("/admin/edicoes");
}

/** Background AI transcription: settings, live state and page counts for the admin panel. */
export async function aiWorkerStatusAction() {
  await requireSession();
  const [settings, stats, extractPending, people, places, embeddings] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: 1 }, select: { aiWorkerEnabled: true, aiWorkerIntervalSec: true } }),
    getRevisionStats(),
    countPendingExtraction(),
    prisma.entity.count({ where: { kind: "person" } }),
    prisma.entity.count({ where: { kind: "place" } }),
    countPendingEmbeddings(),
  ]);
  return {
    enabled: settings?.aiWorkerEnabled ?? false,
    intervalSec: settings?.aiWorkerIntervalSec ?? 20,
    state: getWorkerState(),
    stats,
    entities: { extractPending, people, places },
    semantic: { configured: isEmbeddingConfigured(), ...embeddings },
  };
}

export async function aiWorkerSetAction(enabled: boolean, intervalSec: number) {
  await requireSession();
  const interval = Math.min(600, Math.max(0, Math.round(Number(intervalSec) || 0)));
  const data = { aiWorkerEnabled: Boolean(enabled), aiWorkerIntervalSec: interval };
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, creditsText: "willabs.ia.br", ...data },
  });
  wakeWorker(); // apply now instead of after the current wait
  return aiWorkerStatusAction();
}
