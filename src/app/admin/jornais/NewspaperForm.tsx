"use client";

import { useActionState } from "react";
import { createNewspaperAction, type ActionState } from "@/lib/actions/newspaper-actions";

export default function NewspaperForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createNewspaperAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">Nome do jornal</span>
        <input
          name="name"
          type="text"
          required
          placeholder="Jornal do Alto São Francisco"
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">URL do logo (opcional)</span>
        <input
          name="logoUrl"
          type="text"
          placeholder="/logo.svg"
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Adicionar"}
      </button>
      {state?.error && <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>}
    </form>
  );
}
