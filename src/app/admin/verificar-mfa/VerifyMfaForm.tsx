"use client";

import { useActionState } from "react";
import { verifyMfaAction, type ActionState } from "@/lib/actions/auth-actions";

export default function VerifyMfaForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    verifyMfaAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Código</span>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          placeholder="000000 ou código de backup"
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <span className="text-xs text-slate-400">
          Digite o código de 6 dígitos do seu aplicativo autenticador, ou um dos seus códigos de
          backup se não tiver mais acesso a ele.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Verificando..." : "Verificar"}
      </button>
    </form>
  );
}
