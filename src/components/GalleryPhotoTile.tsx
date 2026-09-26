"use client";

import { useActionState, useState } from "react";
import { MessageCirclePlus } from "lucide-react";
import { suggestPhotoCaptionAction, type SuggestionActionState } from "@/lib/actions/gallery-suggestion-actions";

export default function GalleryPhotoTile({ photo }: { photo: { id: number; url: string; caption: string | null } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SuggestionActionState, FormData>(
    suggestPhotoCaptionAction,
    undefined
  );

  return (
    <div className="group relative overflow-hidden rounded-xl border border-paper-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption ?? ""} className="aspect-square w-full object-cover" />

      {photo.caption && (
        <p className="line-clamp-2 px-2 py-1.5 text-xs text-slate-500">{photo.caption}</p>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          title="Sabe quem está nessa foto? Conte pra gente."
        >
          <MessageCirclePlus size={12} />
          Quem é?
        </button>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/70 p-2">
          {state && "success" in state && state.success ? (
            <p className="text-center text-xs text-white">{state.success}</p>
          ) : (
            <form action={action} className="flex flex-col gap-1.5">
              <input type="hidden" name="photoId" value={photo.id} />
              <textarea
                name="suggestion"
                required
                rows={2}
                placeholder="Quem ou o que aparece nessa foto?"
                className="w-full rounded-md border-0 px-2 py-1 text-xs outline-none"
              />
              <input
                name="submitterName"
                type="text"
                placeholder="Seu nome (opcional)"
                className="w-full rounded-md border-0 px-2 py-1 text-xs outline-none"
              />
              {state && "error" in state && state.error && (
                <p className="text-[11px] text-red-300">{state.error}</p>
              )}
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-md bg-accent-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
                >
                  {pending ? "Enviando..." : "Enviar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-white/20 px-2 py-1 text-[11px] text-white hover:bg-white/30"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
