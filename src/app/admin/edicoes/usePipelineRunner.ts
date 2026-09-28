"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  pipelineDoneAction,
  pipelineStatusAction,
  pipelineStepAction,
  resetRevisionAction,
} from "@/lib/actions/pipeline-actions";

/**
 * What to run on each chosen edition:
 *  - full:      whatever is missing — text (if none yet) → AI (pending pages) → search
 *  - extract:   re-read the text from the PDF
 *  - revise:    AI-transcribe the pending pages
 *  - redo-ai:   discard the AI transcription and redo every page
 *  - retry-ai:  retry only the pages whose AI attempt failed
 *  - index:     send the current text to the search
 */
export type RunPlan = "full" | "extract" | "revise" | "redo-ai" | "retry-ai" | "index";

export const PLAN_LABEL: Record<RunPlan, string> = {
  full: "Fluxo completo",
  extract: "Extrair texto do PDF",
  revise: "Revisar com IA",
  "redo-ai": "Refazer IA",
  "retry-ai": "Tentar de novo as páginas com erro",
  index: "Enviar à busca",
};

export type RunState = {
  running: boolean;
  plan: RunPlan | null;
  total: number;
  done: number;
  current: number | null;
  log: { id: number | null; text: string; kind: "ok" | "err" | "info" }[];
  outcome: "done" | "stopped" | "quota" | null;
};

const IDLE: RunState = { running: false, plan: null, total: 0, done: 0, current: null, log: [], outcome: null };

/**
 * Drives the per-edition pipeline from the browser, one short server call at
 * a time: stops on request (Parar) or when Gemini's free daily quota runs
 * out, never losing work already saved.
 */
export function usePipelineRunner() {
  const router = useRouter();
  const [state, setState] = useState<RunState>(IDLE);
  const stopRef = useRef(false);

  const log = (id: number | null, text: string, kind: "ok" | "err" | "info" = "info") =>
    setState((s) => ({ ...s, log: [...s.log.slice(-199), { id, text, kind }] }));

  const run = useCallback(
    async (ids: number[], plan: RunPlan) => {
      if (ids.length === 0) return;
      stopRef.current = false;
      setState({ ...IDLE, running: true, plan, total: ids.length });
      let outcome: RunState["outcome"] = "done";
      const statuses = plan === "full" ? await pipelineStatusAction(ids) : {};

      outer: for (const id of ids) {
        if (stopRef.current) {
          outcome = "stopped";
          break;
        }
        setState((s) => ({ ...s, current: id }));

        const stages: ("extract" | "revise" | "index")[] =
          plan === "full"
            ? [...((statuses[id]?.pages ?? 0) === 0 ? (["extract"] as const) : []), "revise", "index"]
            : plan === "extract"
              ? ["extract"]
              : plan === "index"
                ? ["index"]
                : ["revise"];

        if (plan === "redo-ai" || plan === "retry-ai") {
          const r = await resetRevisionAction(id, plan === "retry-ai");
          log(id, plan === "redo-ai" ? `transcrição apagada (${r.count} pág.), refazendo` : `${r.count} pág. com erro liberadas`);
        }

        for (const stage of stages) {
          // "revise" handles one page per call; loop until the edition is done.
          for (let guard = 0; guard < 200; guard++) {
            if (stopRef.current) {
              outcome = "stopped";
              break outer;
            }
            const r = await pipelineStepAction(id, stage);
            if (!r.ok) {
              log(id, r.detail, "err");
              if ("quota" in r && r.quota) {
                outcome = "quota";
                break outer;
              }
              break; // this stage failed for this edition; go on with the next stage/edition
            }
            log(id, r.detail, r.detail.includes("falhou") ? "err" : "ok");
            if (r.done) break;
          }
        }
        setState((s) => ({ ...s, done: s.done + 1 }));
      }

      setState((s) => ({ ...s, running: false, current: null, outcome }));
      await pipelineDoneAction();
      router.refresh();
    },
    [router]
  );

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const clear = useCallback(() => setState(IDLE), []);

  return { state, run, stop, clear };
}
