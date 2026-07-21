"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { deleteSponsorAction, updateSponsorAction, type ActionState } from "@/lib/actions/sponsor-actions";
import DeleteButton from "@/components/admin/DeleteButton";

type Sponsor = {
  id: number;
  name: string;
  logoUrl: string;
  linkUrl: string | null;
  placement: "SIDEBAR" | "FOOTER" | "BOTH";
  order: number;
  active: boolean;
};

const PLACEMENT_LABEL: Record<Sponsor["placement"], string> = {
  BOTH: "Lateral + rodapé",
  SIDEBAR: "Somente lateral",
  FOOTER: "Somente rodapé",
};

export default function SponsorRow({ sponsor }: { sponsor: Sponsor }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSponsorAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={sponsor.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Nome</span>
              <input
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={sponsor.name}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Link</span>
              <input
                name="linkUrl"
                type="url"
                defaultValue={sponsor.linkUrl ?? ""}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Onde exibir</span>
              <select
                name="placement"
                defaultValue={sponsor.placement}
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
                defaultValue={sponsor.order}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs">
              <input
                name="active"
                type="checkbox"
                defaultChecked={sponsor.active}
                className="h-4 w-4 rounded border-brand-200"
              />
              <span className="font-medium text-slate-500">Ativo</span>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Trocar logo (opcional)</span>
            <input
              name="logo"
              type="file"
              accept="image/*"
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
    <div className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-50">
        <Image src={sponsor.logoUrl} alt={sponsor.name} width={64} height={40} className="max-h-full max-w-full object-contain" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {sponsor.name}
          {!sponsor.active && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              inativo
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {PLACEMENT_LABEL[sponsor.placement]} · ordem {sponsor.order}
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
        <DeleteButton
          action={deleteSponsorAction}
          id={sponsor.id}
          confirmMessage={`Remover o patrocinador "${sponsor.name}"?`}
        />
      </div>
    </div>
  );
}
