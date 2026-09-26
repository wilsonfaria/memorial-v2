"use client";

import { useActionState } from "react";
import { updateSmtpConfigAction, type ActionState } from "@/lib/actions/settings-actions";

const inputClass =
  "rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400";

export default function SmtpConfigForm({
  initial,
}: {
  initial: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
    fromEmail: string;
  } | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSmtpConfigAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Servidor SMTP (host)</span>
          <input
            name="host"
            type="text"
            required
            defaultValue={initial?.host ?? ""}
            placeholder="smtp.hostinger.com"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Porta</span>
          <input
            name="port"
            type="number"
            required
            defaultValue={initial?.port ?? 587}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Usuário SMTP</span>
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
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Nome do remetente</span>
          <input
            name="fromName"
            type="text"
            required
            defaultValue={initial?.fromName ?? "Memorial do Jornal"}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Email do remetente</span>
          <input
            name="fromEmail"
            type="email"
            required
            defaultValue={initial?.fromEmail ?? ""}
            placeholder="naoresponda@seudominio.com"
            className={inputClass}
          />
        </label>

        <label className="flex items-start gap-2.5 text-xs md:col-span-2">
          <input
            name="secure"
            type="checkbox"
            defaultChecked={initial?.secure ?? false}
            className="mt-0.5 h-4 w-4 rounded border-brand-200"
          />
          <span className="font-medium text-slate-600">
            Usar conexão segura (TLS implícito, geralmente porta 465)
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
        <span className="text-xs text-slate-400">Fazemos login real no servidor antes de gravar.</span>
      </div>
    </form>
  );
}
