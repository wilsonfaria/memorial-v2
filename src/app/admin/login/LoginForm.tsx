"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions/auth-actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Usuário</span>
        <input
          name="username"
          type="text"
          required
          autoFocus
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Senha</span>
        <input
          name="password"
          type="password"
          required
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <Link
        href="/admin/esqueci-senha"
        className="text-center text-xs text-brand-600 underline hover:text-brand-700"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}
