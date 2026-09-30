"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle, ImageOff } from "lucide-react";
import { updateAiProviderAction, type ActionState } from "@/lib/actions/ai-provider-actions";
import type { ProviderStatus } from "@/lib/ai-providers/registry";
import Card from "@/components/admin/Card";

const inputClass =
  "w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400";

export default function AiProviderPanel({ providers }: { providers: ProviderStatus[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAiProviderAction, undefined);

  return (
    <Card
      title="Provedor de IA (transcrição e extração)"
      description="Escolha qual provedor a transcrição de páginas e a extração de pessoas/lugares usam, e troque as chaves sem editar o .env. A chave também pode continuar vindo só da variável de ambiente — deixe o campo em branco para isso."
      className="mb-6"
    >
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          {providers.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors ${
                p.active ? "border-brand-400 bg-brand-50/50" : "border-paper-200 hover:border-brand-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input type="radio" name="activeProvider" value={p.id} defaultChecked={p.active} className="h-4 w-4" />
                <span className="text-sm font-semibold text-slate-700">{p.label}</span>

                {p.configured ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    <CheckCircle2 size={12} />
                    {p.usingOverrideKey ? "chave salva aqui" : "chave via .env"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    <XCircle size={12} />
                    sem chave
                  </span>
                )}

                {!p.supportsVision && (
                  <span
                    className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                    title="Esta conta/provedor não tem modelo com visão — não consegue ler a imagem da página, só a etapa de extração (texto → JSON) funciona."
                  >
                    <ImageOff size={12} />
                    sem visão — só extração
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-3 pl-6 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-600">Chave de API</span>
                  <input
                    name={`${p.id}_apiKey`}
                    type="password"
                    placeholder={p.configured ? "•••••••• (deixe em branco para manter)" : "cole a chave aqui"}
                    className={inputClass}
                  />
                </label>

                <div />

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-600">
                    Modelos de transcrição (imagem){!p.supportsVision && " — indisponível"}
                  </span>
                  <input
                    name={`${p.id}_models`}
                    type="text"
                    defaultValue={p.models.join(", ")}
                    placeholder="modelo-a, modelo-b"
                    disabled={!p.supportsVision}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-slate-600">Modelos de extração (texto → JSON)</span>
                  <input
                    name={`${p.id}_extractModels`}
                    type="text"
                    defaultValue={p.extractModels.join(", ")}
                    placeholder="modelo-a, modelo-b"
                    className={inputClass}
                  />
                </label>
              </div>
            </label>
          ))}
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

        <div className="flex items-center gap-4 border-t border-paper-200 pt-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Testando..." : "Testar e ativar"}
          </button>
          <span className="text-xs text-slate-400">
            Faz uma chamada real e barata ao provedor escolhido antes de salvar.
          </span>
        </div>
      </form>
    </Card>
  );
}
