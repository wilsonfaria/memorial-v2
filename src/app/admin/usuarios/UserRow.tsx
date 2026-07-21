"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { deleteUserAction, updateUserAction, type ActionState } from "@/lib/actions/auth-actions";
import DeleteButton from "@/components/admin/DeleteButton";

type User = { id: number; name: string; username: string; email: string };

export default function UserRow({
  user,
  isSelf,
  canDelete,
}: {
  user: User;
  isSelf: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateUserAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={user.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Nome</span>
              <input
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={user.name}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Usuário</span>
              <input
                name="username"
                type="text"
                required
                minLength={3}
                defaultValue={user.username}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

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
    <div className="flex items-center justify-between rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-700">
          {user.name}
          {isSelf && (
            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-brand-700">
              você
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {user.username} · {user.email}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        {canDelete && (
          <DeleteButton
            action={deleteUserAction}
            id={user.id}
            confirmMessage={`Remover o usuário "${user.name}"? Ele perderá o acesso à administração.`}
          />
        )}
      </div>
    </div>
  );
}
