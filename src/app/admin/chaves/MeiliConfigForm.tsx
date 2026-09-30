"use client";

import { useActionState } from "react";
import { updateMeiliConfigAction, type ActionState } from "@/lib/actions/vault-actions";

const inputClass =
  "rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400";

export default function MeiliConfigForm({ configured, url }: { configured: boolean; url: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMeiliConfigAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Endereço (URL)</span>
          <input name="url" type="text" required defaultValue={url} placeholder="http://localhost:7700" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-slate-600">Chave de API</span>
          <input
            name="key"
            type="password"
            placeholder={configured ? "•••••••• (deixe em branco para manter a atual)" : "cole a chave aqui"}
            className={inputClass}
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="flex items-center gap-4 border-t border-paper-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Testando..." : "Testar e salvar"}
        </button>
        <span className="text-xs text-slate-400">Sem Meilisearch configurado, a busca cai automaticamente no MariaDB.</span>
      </div>
    </form>
  );
}
