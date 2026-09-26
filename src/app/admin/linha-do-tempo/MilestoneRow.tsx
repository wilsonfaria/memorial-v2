"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { deleteMilestoneAction, updateMilestoneAction, type ActionState } from "@/lib/actions/timeline-actions";
import DeleteButton from "@/components/admin/DeleteButton";

type Milestone = {
  id: number;
  year: number;
  title: string;
  description: string | null;
  order: number;
  published: boolean;
};

export default function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateMilestoneAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={milestone.id} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ano</span>
              <input
                name="year"
                type="number"
                required
                defaultValue={milestone.year}
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
                defaultValue={milestone.title}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Descrição</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={milestone.description ?? ""}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ordem</span>
              <input
                name="order"
                type="number"
                defaultValue={milestone.order}
                className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs">
              <input
                name="published"
                type="checkbox"
                defaultChecked={milestone.published}
                className="h-4 w-4 rounded border-brand-200"
              />
              <span className="font-medium text-slate-500">Publicado</span>
            </label>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      <div className="w-14 shrink-0 text-sm font-semibold text-brand-700">{milestone.year}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {milestone.title}
          {!milestone.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              oculto
            </span>
          )}
        </p>
        {milestone.description && (
          <p className="truncate text-xs text-slate-400">{milestone.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        <DeleteButton
          action={deleteMilestoneAction}
          id={milestone.id}
          confirmMessage={`Mover o marco "${milestone.title}" (${milestone.year}) para a lixeira?`}
        />
      </div>
    </div>
  );
}
