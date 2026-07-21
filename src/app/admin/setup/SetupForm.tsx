"use client";

import { useActionState } from "react";
import { createMasterUserAction, type ActionState } from "@/lib/actions/auth-actions";

export default function SetupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createMasterUserAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Nome</span>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Usuário</span>
        <input
          name="username"
          type="text"
          required
          minLength={3}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Email</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Senha</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Confirmar senha</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar usuário master"}
      </button>
    </form>
  );
}
