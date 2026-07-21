"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth-actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Nova senha</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoFocus
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Confirmar nova senha</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}
