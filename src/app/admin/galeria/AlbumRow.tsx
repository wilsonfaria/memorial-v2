"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Pencil, ExternalLink, X } from "lucide-react";
import {
  addAlbumPhotoAction,
  deleteAlbumAction,
  deletePhotoAction,
  updateAlbumAction,
  type ActionState,
} from "@/lib/actions/gallery-actions";
import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";
import DeleteButton from "@/components/admin/DeleteButton";

type Photo = { id: number; url: string; caption: string | null };
type Album = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  order: number;
  published: boolean;
  photos: Photo[];
};

function makeFormData(fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, String(value));
  return fd;
}

export default function AlbumRow({ album }: { album: Album }) {
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    // Photos go up one request each (addAlbumPhotoAction) so a big batch never
    // hits the Server Action body limit; the album fields are saved first.
    const photos = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    formData.delete("photos");

    const tooBig = photos.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) return { error: `"${tooBig.name}" passa de ${formatMaxSize(MAX_IMAGE_BYTES)}. Nada foi enviado.` };

    const result = await updateAlbumAction(prev, formData);
    if (result?.error || photos.length === 0) return result;

    for (const [i, photo] of photos.entries()) {
      setProgress(`Enviando foto ${i + 1} de ${photos.length}...`);
      const fd = new FormData();
      fd.set("id", String(album.id));
      fd.set("photo", photo);
      const photoResult = await addAlbumPhotoAction(fd);
      if (photoResult?.error) {
        setProgress(null);
        return { error: `${photoResult.error} ${i} de ${photos.length} foto(s) enviadas antes do erro.` };
      }
    }
    setProgress(null);
    return { success: `Álbum atualizado e ${photos.length} foto(s) adicionada(s).` };
  }, undefined);

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={album.id} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Título</span>
              <input
                name="title"
                type="text"
                required
                minLength={2}
                defaultValue={album.title}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Endereço (slug)</span>
              <input
                name="slug"
                type="text"
                defaultValue={album.slug}
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Descrição</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={album.description ?? ""}
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">
              {album.coverImageUrl ? "Trocar imagem de capa" : "Imagem de capa (opcional)"}
            </span>
            <input
              name="coverImage"
              type="file"
              accept="image/*"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {album.photos.length > 0 && (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">Fotos</span>
              <div className="flex flex-wrap gap-2">
                {album.photos.map((photo) => (
                  <div key={photo.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-paper-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption ?? ""} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deletePhotoAction(makeFormData({ id: photo.id }))}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
                      title="Remover foto"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Adicionar fotos</span>
            <input
              name="photos"
              type="file"
              accept="image/*"
              multiple
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-slate-500">Ordem</span>
              <input
                name="order"
                type="number"
                defaultValue={album.order}
                className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs">
              <input
                name="published"
                type="checkbox"
                defaultChecked={album.published}
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
              {pending ? (progress ?? "Salvando...") : "Salvar"}
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
          {album.title}
          {!album.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              rascunho
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          /galeria/{album.slug} · {album.photos.length} foto{album.photos.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {album.published && (
          <Link
            href={`/galeria/${album.slug}`}
            target="_blank"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700"
            title="Ver álbum publicado"
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
          action={deleteAlbumAction}
          id={album.id}
          confirmMessage={`Mover o álbum "${album.title}" (e suas fotos) para a lixeira?`}
        />
      </div>
    </div>
  );
}
