"use client";

import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

type SlideDefaults = {
  headline: string;
  subtext: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  published: boolean;
};

const inputClass = "rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400";

/** Field set shared by the "new slide" and "edit slide" forms. */
export default function HeroSlideFields({ slide }: { slide?: SlideDefaults }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">
          {slide?.imageUrl ? "Trocar imagem de fundo" : "Imagem de fundo (opcional)"}
        </span>
        {slide?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.imageUrl} alt="" className="mb-1 h-24 w-44 rounded-lg border border-paper-200 object-cover" />
        )}
        <input name="image" type="file" accept="image/*" className={inputClass} />
        <span className="text-[11px] text-slate-400">
          Até {formatMaxSize(MAX_IMAGE_BYTES)}. Formato largo (ex.: 1920×700) fica melhor.
        </span>
      </label>
      {slide?.imageUrl && (
        <label className="flex items-center gap-2 text-xs">
          <input name="removeImage" type="checkbox" className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Remover imagem (fundo na cor da marca)</span>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Título</span>
        <input name="headline" type="text" required minLength={2} defaultValue={slide?.headline ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Texto (opcional)</span>
        <textarea name="subtext" rows={2} defaultValue={slide?.subtext ?? ""} className={inputClass} />
      </label>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Texto do botão (opcional)</span>
          <input
            name="ctaLabel"
            type="text"
            defaultValue={slide?.ctaLabel ?? ""}
            placeholder="EXPLORAR O ACERVO"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Link do botão</span>
          <input name="ctaHref" type="text" defaultValue={slide?.ctaHref ?? ""} placeholder="/edicoes" className={inputClass} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          name="published"
          type="checkbox"
          defaultChecked={slide?.published ?? true}
          className="h-4 w-4 rounded border-brand-200"
        />
        <span className="font-medium text-slate-500">Publicado</span>
      </label>
    </>
  );
}
