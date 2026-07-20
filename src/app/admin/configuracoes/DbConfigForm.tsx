"use client";

import { useActionState } from "react";
import { updateDbConfigAction, type ActionState } from "@/lib/actions/settings-actions";

export default function DbConfigForm({
  initial,
}: {
  initial: { host: string; port: number; database: string; user: string } | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateDbConfigAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Endereço (host)</span>
          <input
            name="host"
            type="text"
            required
            defaultValue={initial?.host ?? ""}
            placeholder="localhost"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Porta</span>
          <input
            name="port"
            type="number"
            required
            defaultValue={initial?.port ?? 3306}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Nome do banco</span>
          <input
            name="database"
            type="text"
            required
            defaultValue={initial?.database ?? ""}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Usuário</span>
          <input
            name="user"
            type="text"
            required
            defaultValue={initial?.user ?? ""}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Senha</span>
        <input
          name="password"
          type="password"
          placeholder={initial ? "•••••••• (deixe em branco para manter a atual)" : ""}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <span className="text-[11px] text-slate-400">
          Armazenada de forma criptografada. Deixe em branco para não alterar a senha atual.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Testando conexão..." : "Testar e salvar"}
      </button>
    </form>
  );
}
