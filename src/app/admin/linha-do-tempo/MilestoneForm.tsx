"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMilestoneAction, type ActionState } from "@/lib/actions/timeline-actions";

export default function MilestoneForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createMilestoneAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Ano</span>
          <input
            name="year"
            type="number"
            required
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Título curto</span>
          <input
            name="title"
            type="text"
            required
            minLength={2}
            placeholder="ex: O Positivo"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Descrição (opcional)</span>
        <textarea
          name="description"
          rows={2}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <div className="flex items-center gap-6">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Ordem</span>
          <input
            name="order"
            type="number"
            defaultValue={0}
            className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-xs">
          <input name="published" type="checkbox" defaultChecked className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Publicado</span>
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Adicionar marco"}
      </button>
    </form>
  );
}
