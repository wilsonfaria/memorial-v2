"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, ExternalLink } from "lucide-react";
import { deleteCharacterAction, updateCharacterAction, type ActionState } from "@/lib/actions/character-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import RichTextEditor from "@/components/admin/RichTextEditor";

type Character = {
  id: number;
  name: string;
  slug: string;
  role: string | null;
  bio: string;
  photoUrl: string | null;
  bornYear: number | null;
  diedYear: number | null;
  order: number;
  published: boolean;
};

export default function CharacterRow({ character, editing = false }: { character: Character; editing?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateCharacterAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={character.id} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Nome</span>
              <input
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={character.name}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Endereço (slug)</span>
              <input
                name="slug"
                type="text"
                defaultValue={character.slug}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Subtítulo/papel</span>
            <input
              name="role"
              type="text"
              defaultValue={character.role ?? ""}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Biografia</span>
            <RichTextEditor name="bio" defaultValue={character.bio} />
          </label>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">
                {character.photoUrl ? "Trocar foto" : "Foto (opcional)"}
              </span>
              <input
                name="photo"
                type="file"
                accept="image/*"
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ano de nascimento</span>
              <input
                name="bornYear"
                type="number"
                defaultValue={character.bornYear ?? ""}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ano de falecimento</span>
              <input
                name="diedYear"
                type="number"
                defaultValue={character.diedYear ?? ""}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ordem</span>
              <input
                name="order"
                type="number"
                defaultValue={character.order}
                className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs">
              <input
                name="published"
                type="checkbox"
                defaultChecked={character.published}
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
            <Link
              href="/admin/personagens"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-brand-100"
            >
              Fechar
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      {character.photoUrl && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50">
          <Image src={character.photoUrl} alt={character.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          <Link href={`/admin/personagens/${character.id}`} className="hover:text-brand-700 hover:underline">
            {character.name}
          </Link>
          {!character.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              rascunho
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {character.role ?? `/personagens/${character.slug}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {character.published && (
          <Link
            href={`/personagens/${character.slug}`}
            target="_blank"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
            title="Ver publicado"
          >
            <ExternalLink size={13} />
          </Link>
        )}
        <Link
          href={`/admin/personagens/${character.id}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
          title="Editar"
        >
          <Pencil size={13} />
        </Link>
        <DeleteButton
          action={deleteCharacterAction}
          id={character.id}
          confirmMessage={`Mover o personagem "${character.name}" para a lixeira?`}
        />
      </div>
    </div>
  );
}
