"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmMfaEnrollmentAction,
  startMfaEnrollmentAction,
  type ActionState,
} from "@/lib/actions/mfa-actions";

type Step = "idle" | "loading" | "verify" | "done";

export default function EnrollMfaCard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    confirmMfaEnrollmentAction,
    undefined
  );

  const effectiveStep: Step = state?.success && state.backupCodes ? "done" : step;

  async function handleStart() {
    setStep("loading");
    setStartError(null);
    const result = await startMfaEnrollmentAction();
    if ("error" in result) {
      setStartError(result.error);
      setStep("idle");
      return;
    }
    setQrCodeDataUrl(result.qrCodeDataUrl);
    setSecret(result.secret);
    setStep("verify");
  }

  if (effectiveStep === "idle" || effectiveStep === "loading") {
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">
          Adicione uma camada extra de segurança: além da senha, você vai precisar de um código do
          seu celular (Google Authenticator, Authy, etc.) para entrar.
        </p>
        {startError && <p className="mb-2 text-sm text-red-600">{startError}</p>}
        <button
          onClick={handleStart}
          disabled={step === "loading"}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {step === "loading" ? "Gerando..." : "Ativar verificação em duas etapas"}
        </button>
      </div>
    );
  }

  if (effectiveStep === "verify") {
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">
          Escaneie o QR code com seu aplicativo autenticador e digite o código de 6 dígitos gerado
          para confirmar.
        </p>
        <div className="mb-3 flex flex-col items-center gap-2 rounded-lg border border-paper-200 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="QR code de configuração" className="h-44 w-44" />
          <p className="text-center text-xs text-slate-400">
            Não consegue escanear? Digite manualmente:
            <br />
            <span className="font-mono text-slate-600">{secret}</span>
          </p>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">Código de verificação</span>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoFocus
              required
              placeholder="000000"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Confirmando..." : "Confirmar e ativar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-brand-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // step === "done"
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-green-700">
        {state?.success ?? "Verificação em duas etapas ativada."}
      </p>
      <p className="mb-2 text-sm text-slate-600">
        Guarde estes códigos de backup em um lugar seguro. Cada um pode ser usado uma única vez
        para entrar caso você perca acesso ao seu aplicativo autenticador. Eles não serão mostrados
        de novo.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-paper-200 bg-paper-50 p-4 font-mono text-sm">
        {state?.backupCodes?.map((code) => <span key={code}>{code}</span>)}
      </div>
      <button
        onClick={() => router.refresh()}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Concluir
      </button>
    </div>
  );
}
