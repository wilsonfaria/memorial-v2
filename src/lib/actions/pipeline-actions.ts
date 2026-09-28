"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getPipelineStatuses,
  getPipelineTotals,
  pickEditions,
  resetRevision,
  runPipelineStep,
  type PickCriterion,
  type PipelineStage,
} from "@/lib/pipeline";

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
