"use client";

import { useActionState } from "react";
import { updateDbConfigAction, type ActionState } from "@/lib/actions/settings-actions";

const inputClass =
  "rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400";

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
    <form action={action} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Endereço (host)</span>
          <input
            name="host"
            type="text"
            required
            defaultValue={initial?.host ?? ""}
            placeholder="localhost"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Porta</span>
          <input
            name="port"
            type="number"
            required
            defaultValue={initial?.port ?? 3306}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Nome do banco</span>
          <input
            name="database"
            type="text"
            required
            defaultValue={initial?.database ?? ""}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Usuário</span>
          <input
            name="user"
            type="text"
            required
            defaultValue={initial?.user ?? ""}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Senha</span>
          <input
            name="password"
            type="password"
            placeholder={initial ? "•••••••• (deixe em branco para manter a atual)" : ""}
            className={inputClass}
          />
          <span className="text-[11px] leading-relaxed text-slate-400">
            Armazenada de forma criptografada. Deixe em branco para não alterar a senha atual.
          </span>
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="flex items-center gap-4 border-t border-paper-200 pt-5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Testando conexão..." : "Testar e salvar"}
        </button>
        <span className="text-xs text-slate-400">A conexão é testada antes de ser gravada.</span>
      </div>
    </form>
  );
}
