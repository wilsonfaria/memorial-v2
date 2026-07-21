"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSponsorAction, type ActionState } from "@/lib/actions/sponsor-actions";

export default function SponsorForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createSponsorAction,
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
          <span className="font-medium text-slate-500">Nome do patrocinador</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Link (opcional)</span>
          <input
            name="linkUrl"
            type="url"
            placeholder="https://..."
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Onde exibir</span>
          <select
            name="placement"
            defaultValue="BOTH"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="BOTH">Lateral + rodapé</option>
            <option value="SIDEBAR">Somente lateral</option>
            <option value="FOOTER">Somente rodapé</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Ordem</span>
          <input
            name="order"
            type="number"
            defaultValue={0}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs">
          <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Ativo</span>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Logo (imagem)</span>
        <input
          name="logo"
          type="file"
          accept="image/*"
          required
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Adicionar patrocinador"}
      </button>
    </form>
  );
}
