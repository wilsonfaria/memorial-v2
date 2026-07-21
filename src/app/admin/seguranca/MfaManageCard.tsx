"use client";

import { useActionState, useState } from "react";
import {
  disableMfaAction,
  regenerateBackupCodesAction,
  type ActionState,
} from "@/lib/actions/mfa-actions";

export default function MfaManageCard() {
  const [disableState, disableAction, disablePending] = useActionState<ActionState, FormData>(
    disableMfaAction,
    undefined
  );
  const [regenState, regenAction, regenPending] = useActionState<ActionState, FormData>(
    regenerateBackupCodesAction,
    undefined
  );
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen, setShowRegen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-green-700">
        Verificação em duas etapas está ativada nesta conta.
      </p>

      <div>
        {!showRegen ? (
          <button
            onClick={() => setShowRegen(true)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Gerar novos códigos de backup
          </button>
        ) : (
          <form action={regenAction} className="flex flex-col gap-2 rounded-lg border border-paper-200 p-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Confirme sua senha</span>
              <input
                name="password"
                type="password"
                required
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            {regenState?.error && <p className="text-sm text-red-600">{regenState.error}</p>}
            {regenState?.backupCodes && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-paper-200 bg-paper-50 p-3 font-mono text-sm">
                {regenState.backupCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={regenPending}
                className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {regenPending ? "Gerando..." : "Gerar novos códigos"}
              </button>
              <button
                type="button"
                onClick={() => setShowRegen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
              >
                Fechar
              </button>
            </div>
          </form>
        )}
      </div>

      <div>
        {!showDisable ? (
          <button
            onClick={() => setShowDisable(true)}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Desativar verificação em duas etapas
          </button>
        ) : (
          <form action={disableAction} className="flex flex-col gap-2 rounded-lg border border-paper-200 p-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Confirme sua senha</span>
              <input
                name="password"
                type="password"
                required
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            {disableState?.error && <p className="text-sm text-red-600">{disableState.error}</p>}
            {disableState?.success && <p className="text-sm text-green-600">{disableState.success}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={disablePending}
                className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {disablePending ? "Desativando..." : "Desativar"}
              </button>
              <button
                type="button"
                onClick={() => setShowDisable(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
