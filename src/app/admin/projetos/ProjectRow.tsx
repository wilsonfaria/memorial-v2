"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Pencil, ExternalLink } from "lucide-react";
import { deleteProjectAction, updateProjectAction, type ActionState } from "@/lib/actions/project-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import RichTextEditor from "@/components/admin/RichTextEditor";

type Project = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  coverImageUrl: string | null;
  order: number;
  published: boolean;
};

export default function ProjectRow({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProjectAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={project.id} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Título</span>
              <input
                name="title"
                type="text"
                required
                minLength={2}
                defaultValue={project.title}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Endereço (slug)</span>
              <input
                name="slug"
                type="text"
                defaultValue={project.slug}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Resumo</span>
            <textarea
              name="summary"
              rows={2}
              defaultValue={project.summary ?? ""}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Conteúdo</span>
            <RichTextEditor name="body" defaultValue={project.body} />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">
              {project.coverImageUrl ? "Trocar imagem de capa" : "Imagem de capa (opcional)"}
            </span>
            <input
              name="coverImage"
              type="file"
              accept="image/*"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ordem</span>
              <input
                name="order"
                type="number"
                defaultValue={project.order}
                className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs">
              <input
                name="published"
                type="checkbox"
                defaultChecked={project.published}
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {project.title}
          {!project.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              rascunho
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">/projetos/{project.slug}</p>
      </div>
      <div className="flex items-center gap-1">
        {project.published && (
          <Link
            href={`/projetos/${project.slug}`}
            target="_blank"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
            title="Ver projeto publicado"
          >
            <ExternalLink size={13} />
          </Link>
        )}
        <button
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        <DeleteButton
          action={deleteProjectAction}
          id={project.id}
          confirmMessage={`Mover o projeto "${project.title}" para a lixeira?`}
        />
      </div>
    </div>
  );
}
