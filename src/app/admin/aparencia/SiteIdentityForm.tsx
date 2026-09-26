"use client";

import { useActionState, useState } from "react";
import { updateSiteIdentityAction, type ActionState } from "@/lib/actions/newspaper-actions";

export default function SiteIdentityForm({
  initialName,
  initialTagline,
  initialLogoUrl,
}: {
  initialName: string;
  initialTagline: string;
  initialLogoUrl: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSiteIdentityAction,
    undefined
  );
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Logo</h2>
        <p className="mb-3 text-xs text-slate-500">
          Aparece no cabeçalho e no rodapé do site. Recomendado: fundo transparente ou branco.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg border border-paper-200 bg-brand-700 p-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Prévia da logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[11px] text-white/50">Sem logo</span>
            )}
          </div>
          <input
            name="logo"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
            className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Nome do jornal (título do site)</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            defaultValue={initialName}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Slogan (subtítulo no cabeçalho)</span>
          <input
            name="tagline"
            type="text"
            defaultValue={initialTagline}
            placeholder="Ex: Memorial digital do acervo"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar identidade"}
      </button>
    </form>
  );
}
