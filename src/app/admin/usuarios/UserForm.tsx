"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, type ActionState } from "@/lib/actions/auth-actions";

export default function UserForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createUserAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Nome</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Usuário</span>
          <input
            name="username"
            type="text"
            required
            minLength={3}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Senha</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
