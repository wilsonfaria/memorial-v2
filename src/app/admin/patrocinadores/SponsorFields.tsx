"use client";

import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

type BannerDefaults = {
  name: string;
  linkUrl: string | null;
  logoUrl: string;
  order: number;
  active: boolean;
  pinned: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxAppearances: number | null;
};

const inputClass = "rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400";

/** Date → "YYYY-MM-DD" as seen in Brazil (UTC-3), matching how sponsor-actions.ts parses it back. */
function toSiteDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Field set shared by the "new banner" and "edit banner" forms. */
export default function SponsorFields({ banner }: { banner?: BannerDefaults }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Nome do anunciante</span>
          <input name="name" type="text" required minLength={2} defaultValue={banner?.name} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Link (opcional)</span>
          <input
            name="linkUrl"
            type="url"
            placeholder="https://..."
            defaultValue={banner?.linkUrl ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">{banner ? "Trocar imagem (opcional)" : "Imagem do banner"}</span>
        <input name="logo" type="file" accept="image/*" required={!banner} className={inputClass} />
        <span className="text-[11px] text-slate-400">
          Até {formatMaxSize(MAX_IMAGE_BYTES)}. Exibida com 43px de altura (largura proporcional) — prefira logos horizontais.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Limite de aparições</span>
          <input
            name="maxAppearances"
            type="number"
            min={1}
            step={1}
            placeholder="Ilimitado"
            defaultValue={banner?.maxAppearances ?? ""}
            className={inputClass}
          />
          <span className="text-[11px] text-slate-400">Ao atingir, o banner sai do ar sozinho.</span>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Início (opcional)</span>
          <input name="startsAt" type="date" defaultValue={toSiteDate(banner?.startsAt ?? null)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Fim (opcional)</span>
          <input name="endsAt" type="date" defaultValue={toSiteDate(banner?.endsAt ?? null)} className={inputClass} />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="flex items-center gap-2 pb-2 text-xs">
          <input name="active" type="checkbox" defaultChecked={banner?.active ?? true} className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Ativo</span>
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs">
          <input name="pinned" type="checkbox" defaultChecked={banner?.pinned ?? false} className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Fixado (aparece sempre, fora do sorteio)</span>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Ordem entre fixados</span>
          <input name="order" type="number" defaultValue={banner?.order ?? 0} className={`w-24 ${inputClass}`} />
        </label>
      </div>
    </>
  );
}
