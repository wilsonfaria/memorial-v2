"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Pencil, ExternalLink, X } from "lucide-react";
import {
  deletePageAction,
  deletePageImageAction,
  updatePageAction,
  type ActionState,
} from "@/lib/actions/page-actions";
import DeleteButton from "@/components/admin/DeleteButton";

type PageImage = { id: number; url: string };
type Page = {
  id: number;
  slug: string;
  title: string;
  body: string;
  coverImageUrl: string | null;
  published: boolean;
  showInMenu: boolean;
  menuLabel: string | null;
  menuOrder: number;
  images: PageImage[];
};

export default function PageRow({ page }: { page: Page }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updatePageAction,
    undefined
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={page.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Título</span>
              <input
                name="title"
                type="text"
                required
                minLength={2}
                defaultValue={page.title}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Endereço (slug)</span>
              <input
                name="slug"
                type="text"
                defaultValue={page.slug}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Conteúdo (HTML básico)</span>
            <textarea
              name="body"
              required
              rows={10}
              defaultValue={page.body}
              className="rounded-lg border border-brand-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">
              {page.coverImageUrl ? "Trocar imagem de capa" : "Imagem de capa (opcional)"}
            </span>
            <input
              name="coverImage"
              type="file"
              accept="image/*"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {page.images.length > 0 && (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">Galeria</span>
              <div className="flex flex-wrap gap-2">
                {page.images.map((img) => (
                  <div key={img.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-paper-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deletePageImageAction(makeFormData({ id: img.id }))}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
                      title="Remover imagem"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Adicionar imagens à galeria</span>
            <input
              name="galleryImages"
              type="file"
              accept="image/*"
              multiple
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Rótulo no menu</span>
              <input
                name="menuLabel"
                type="text"
                defaultValue={page.menuLabel ?? ""}
                placeholder="usa o título se vazio"
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ordem no menu</span>
              <input
                name="menuOrder"
                type="number"
                defaultValue={page.menuOrder}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-xs">
              <input
                name="showInMenu"
                type="checkbox"
                defaultChecked={page.showInMenu}
                className="h-4 w-4 rounded border-brand-200"
              />
              <span className="font-medium text-slate-500">Mostrar no menu</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                name="published"
                type="checkbox"
                defaultChecked={page.published}
                className="h-4 w-4 rounded border-brand-200"
              />
              <span className="font-medium text-slate-500">Publicada</span>
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
          {page.title}
          {!page.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              rascunho
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          /{page.slug} {page.showInMenu ? `· no menu (ordem ${page.menuOrder})` : "· fora do menu"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {page.published && (
          <Link
            href={`/${page.slug}`}
            target="_blank"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
            title="Ver página publicada"
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
          action={deletePageAction}
          id={page.id}
          confirmMessage={`Remover a página "${page.title}"? Esta ação não pode ser desfeita.`}
        />
      </div>
    </div>
  );
}

function makeFormData(fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, String(value));
  return fd;
}
