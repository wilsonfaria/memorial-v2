"use client";

import { useActionState, useState } from "react";
import { updateAppearanceAction, type ActionState } from "@/lib/actions/settings-actions";
import { generateBrandScale, BRAND_STEPS } from "@/lib/color";

function ColorField({
  name,
  title,
  description,
  initialValue,
}: {
  name: string;
  title: string;
  description: string;
  initialValue: string;
}) {
  const [color, setColor] = useState(initialValue);
  const scale = generateBrandScale(color);

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-slate-700">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          name={name}
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

      <div className="mt-3 flex overflow-hidden rounded-lg border border-paper-200">
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
  );
}

function FlatColorField({
  name,
  title,
  description,
  initialValue,
}: {
  name: string;
  title: string;
  description: string;
  initialValue: string;
}) {
  const [color, setColor] = useState(initialValue);

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-slate-700">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          name={name}
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
        <div
          className="h-10 flex-1 rounded-lg border border-paper-200"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-paper-200 pb-6 last:border-b-0 last:pb-0">
      <h2 className="mb-1 text-base font-semibold text-brand-900">{title}</h2>
      <p className="mb-4 text-xs text-slate-500">{description}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export default function AppearanceForm({
  initialBackgroundColor,
  initialColor,
  initialAccentColor,
  initialSecondaryColor,
  initialSupportColor,
  initialCreditsText,
  initialFacebookUrl,
  initialInstagramUrl,
  initialXUrl,
}: {
  initialBackgroundColor: string;
  initialColor: string;
  initialAccentColor: string;
  initialSecondaryColor: string;
  initialSupportColor: string;
  initialCreditsText: string;
  initialFacebookUrl: string;
  initialInstagramUrl: string;
  initialXUrl: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateAppearanceAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      <Section
        title="Cores"
        description="Definem o visual de todo o site. Cada cor escolhida gera automaticamente uma escala de tons, do mais claro ao mais escuro."
      >
        <FlatColorField
          name="backgroundColor"
          title="Cor de fundo"
          description="Fundo geral das páginas do site (por trás do conteúdo)."
          initialValue={initialBackgroundColor}
        />
        <ColorField
          name="primaryColor"
          title="Cor principal"
          description="Usada no cabeçalho, rodapé, navegação e áreas estruturais do site."
          initialValue={initialColor}
        />
        <ColorField
          name="accentColor"
          title="Cor de destaque (CTA)"
          description="Usada nos botões de ação das edições (abrir, baixar) e outros pontos de destaque."
          initialValue={initialAccentColor}
        />
        <ColorField
          name="secondaryColor"
          title="Cor secundária"
          description="Usada em selos e elementos de apoio visual, como complemento à cor principal."
          initialValue={initialSecondaryColor}
        />
        <ColorField
          name="supportColor"
          title="Cor de apoio"
          description="Usada em fundos e ilustrações leves, como o espaço reservado das miniaturas de PDF."
          initialValue={initialSupportColor}
        />
      </Section>

      <Section
        title="Rodapé"
        description="Texto exibido no rodapé do site, junto ao aviso de direitos autorais, e também no botão “Créditos”."
      >
        <textarea
          name="creditsText"
          defaultValue={initialCreditsText}
          rows={3}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </Section>

      <Section
        title="Redes sociais"
        description="Links exibidos como ícones no rodapé do site. Deixe em branco para ocultar."
      >
        <div className="flex flex-col gap-2">
          <input
            name="facebookUrl"
            type="url"
            defaultValue={initialFacebookUrl}
            placeholder="https://facebook.com/..."
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <input
            name="instagramUrl"
            type="url"
            defaultValue={initialInstagramUrl}
            placeholder="https://instagram.com/..."
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <input
            name="xUrl"
            type="url"
            defaultValue={initialXUrl}
            placeholder="https://x.com/..."
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>
      </Section>

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
