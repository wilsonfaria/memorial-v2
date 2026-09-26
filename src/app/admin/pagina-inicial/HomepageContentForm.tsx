"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { updateHomepageContentAction, type ActionState } from "@/lib/actions/homepage-actions";
import { parseBehindSteps, serializeBehindSteps, type BehindStep } from "@/lib/behind-steps";
import { MAX_ACTION_BODY_BYTES, MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

type HomepageContent = {
  heroMockup1Url: string | null;
  heroMockup2Url: string | null;
  videoTitle: string;
  videoSubtitle: string | null;
  videoEmbedUrl: string | null;
  videoThumbnailUrl: string | null;
  videoButtonLabel: string;
  behindTitle: string;
  behindSubtext: string | null;
  behindPhoto1Url: string | null;
  behindPhoto2Url: string | null;
  behindPhoto3Url: string | null;
  behindLabels: string;
  behindButtonLabel: string;
  behindButtonHref: string;
  navDecadasImageUrl: string | null;
  navAnosImageUrl: string | null;
  navMesesImageUrl: string | null;
  navEdicoesImageUrl: string | null;
  navCronicasImageUrl: string | null;
};

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="border-b border-paper-200 pb-6 last:border-b-0 last:pb-0">
      <h2 className="mb-1 text-base font-semibold text-brand-900">{title}</h2>
      <p className="mb-4 text-xs text-slate-500">{description}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
    </label>
  );
}

function ImageField({ name, label, currentUrl }: { name: string; label: string; currentUrl: string | null }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-500">
        {currentUrl ? `${label} (trocar)` : `${label} (opcional)`}
      </span>
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className="mb-1 h-20 w-32 rounded-lg border border-paper-200 object-cover" />
      )}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {currentUrl && (
        // Read by resolveImageField() in homepage-actions.ts as `${name}Remove`.
        <span className="mt-1 flex items-center gap-2">
          <input name={`${name}Remove`} type="checkbox" className="h-4 w-4 rounded border-brand-200" />
          <span className="font-medium text-slate-500">Remover imagem</span>
        </span>
      )}
    </label>
  );
}

/** Editable list of "Por trás do Memorial" steps, each with its own button link. Submitted as one JSON hidden field. */
function StepsField({ name, initialSteps }: { name: string; initialSteps: BehindStep[] }) {
  const [steps, setSteps] = useState<BehindStep[]>(initialSteps);

  const update = (i: number, patch: Partial<BehindStep>) =>
    setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, delta: number) =>
    setSteps((prev) => {
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(i + delta, 0, item);
      return next;
    });

  const inputClass = "min-w-0 flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400";
  const iconButtonClass =
    "rounded-lg border border-brand-200 p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-2 text-xs">
      <span className="font-medium text-slate-500">Etapas (cada uma vira um botão; link opcional)</span>
      <input type="hidden" name={name} value={serializeBehindSteps(steps)} />
      {steps.map((step, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <input
            type="text"
            value={step.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Nome da etapa"
            aria-label={`Etapa ${i + 1}`}
            className={inputClass}
          />
          <input
            type="text"
            value={step.href}
            onChange={(e) => update(i, { href: e.target.value })}
            placeholder="/projetos/digitalizacao"
            aria-label={`Link da etapa ${i + 1}`}
            className={inputClass}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconButtonClass} title="Mover para cima">
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => move(i, 1)}
            disabled={i === steps.length - 1}
            className={iconButtonClass}
            title="Mover para baixo"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
            className={`${iconButtonClass} hover:text-red-600`}
            title="Remover etapa"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSteps((prev) => [...prev, { label: "", href: "" }])}
        className="inline-flex w-fit items-center gap-1 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
      >
        <Plus size={14} /> Adicionar etapa
      </button>
    </div>
  );
}

export default function HomepageContentForm({ content }: { content: HomepageContent }) {
  const [state, action, pending] = useActionState<ActionState, FormData>((prev, formData) => {
    // All image fields post in one Server Action request, capped at
    // MAX_ACTION_BODY_BYTES — catch it here instead of a runtime error page.
    // (64KB of slack for the text fields and multipart overhead.)
    const files = [...formData.values()].filter((v): v is File => v instanceof File && v.size > 0);
    const tooBig = files.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) return { error: `"${tooBig.name}" passa de ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ACTION_BODY_BYTES - 64 * 1024) {
      return {
        error: `As imagens escolhidas somam ${formatMaxSize(total)}; o limite por envio é ${formatMaxSize(MAX_ACTION_BODY_BYTES)}. Salve trocando menos imagens por vez.`,
      };
    }
    return updateHomepageContentAction(prev, formData);
  }, undefined);

  return (
    <form action={action} className="flex flex-col gap-8">
      <Section
        title="Hero — capa em destaque"
        description="Imagem exibida no canto inferior direito do carrossel, igual em todos os slides. Os slides em si ficam no quadro “Carrossel do hero” acima."
      >
        {/* Single cover; heroMockup2Url is the legacy second cover, shown here until the next save moves it to slot 1. */}
        <ImageField
          name="heroMockup1"
          label="Capa em destaque"
          currentUrl={content.heroMockup1Url ?? content.heroMockup2Url}
        />
      </Section>

      <Section
        title="Memória Viva (vídeo)"
        description="Bloco do documentário. O vídeo é um link incorporado do YouTube/Vimeo — nenhum arquivo de vídeo é enviado ao servidor."
      >
        <TextField name="videoTitle" label="Título" defaultValue={content.videoTitle} />
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Subtítulo (opcional)</span>
          <textarea
            name="videoSubtitle"
            rows={2}
            defaultValue={content.videoSubtitle ?? ""}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <TextField
          name="videoEmbedUrl"
          label="URL do vídeo (YouTube/Vimeo)"
          defaultValue={content.videoEmbedUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <ImageField name="videoThumbnail" label="Miniatura (capa antes de tocar)" currentUrl={content.videoThumbnailUrl} />
        <TextField name="videoButtonLabel" label="Texto do botão" defaultValue={content.videoButtonLabel} />
      </Section>

      <Section
        title="Por trás do Memorial"
        description="Bloco sobre o processo de digitalização e preservação, com 3 fotos e uma lista de etapas — cada etapa aparece como um botão com seu próprio link."
      >
        <TextField name="behindTitle" label="Título" defaultValue={content.behindTitle} />
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Subtexto (opcional)</span>
          <textarea
            name="behindSubtext"
            rows={2}
            defaultValue={content.behindSubtext ?? ""}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <ImageField name="behindPhoto1" label="Foto 1" currentUrl={content.behindPhoto1Url} />
          <ImageField name="behindPhoto2" label="Foto 2" currentUrl={content.behindPhoto2Url} />
          <ImageField name="behindPhoto3" label="Foto 3" currentUrl={content.behindPhoto3Url} />
        </div>
        <StepsField name="behindLabels" initialSteps={parseBehindSteps(content.behindLabels)} />
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <TextField name="behindButtonLabel" label="Texto do botão" defaultValue={content.behindButtonLabel} />
          <TextField name="behindButtonHref" label="Link do botão" defaultValue={content.behindButtonHref} />
        </div>
      </Section>

      <Section
        title="Cards de navegação rápida"
        description="Fotos dos 5 cards de atalho da home (Décadas, Anos, Meses, Edições, Crônicas). Sem foto, o card mostra um ícone simples."
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <ImageField name="navDecadasImage" label="Décadas" currentUrl={content.navDecadasImageUrl} />
          <ImageField name="navAnosImage" label="Anos" currentUrl={content.navAnosImageUrl} />
          <ImageField name="navMesesImage" label="Meses" currentUrl={content.navMesesImageUrl} />
          <ImageField name="navEdicoesImage" label="Edições" currentUrl={content.navEdicoesImageUrl} />
          <ImageField name="navCronicasImage" label="Crônicas" currentUrl={content.navCronicasImageUrl} />
        </div>
      </Section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar página inicial"}
      </button>
    </form>
  );
}
