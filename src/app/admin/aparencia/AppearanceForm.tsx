"use client";

import { useActionState, useState } from "react";
import { updateAppearanceAction, type ActionState } from "@/lib/actions/settings-actions";
import { generateBrandScale, BRAND_STEPS } from "@/lib/color";

export default function AppearanceForm({
  initialColor,
  initialCreditsText,
}: {
  initialColor: string;
  initialCreditsText: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateAppearanceAction,
    undefined
  );
  const [color, setColor] = useState(initialColor);
  const scale = generateBrandScale(color);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Cor principal do site</h2>
        <p className="mb-3 text-xs text-slate-500">
          Escolha uma cor e o sistema gera automaticamente os tons pastéis usados em todo o site
          (cabeçalho, botões, destaques).
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            name="primaryColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-brand-200"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 rounded-lg border border-brand-200 px-2 py-1.5 text-sm font-mono outline-none focus:border-brand-400"
          />
        </div>

        <div className="mt-3 flex overflow-hidden rounded-lg border border-brand-100">
          {BRAND_STEPS.map((step) => (
            <div
              key={step}
              className="flex h-12 flex-1 items-end justify-center pb-1 text-[10px] font-medium"
              style={{ backgroundColor: scale[step], color: step >= 500 ? "white" : "#334155" }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Texto do botão de créditos</h2>
        <p className="mb-3 text-xs text-slate-500">
          Este é o texto exibido no modal do botão “Créditos” no site público.
        </p>
        <textarea
          name="creditsText"
          defaultValue={initialCreditsText}
          rows={3}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar aparência"}
      </button>
    </form>
  );
}
