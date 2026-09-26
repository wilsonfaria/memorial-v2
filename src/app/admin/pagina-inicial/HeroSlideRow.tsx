"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, ImageOff, Pencil } from "lucide-react";
import {
  deleteHeroSlideAction,
  moveHeroSlideAction,
  updateHeroSlideAction,
  type ActionState,
} from "@/lib/actions/hero-slide-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import HeroSlideFields from "./HeroSlideFields";

type Slide = {
  id: number;
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  published: boolean;
};

const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-30 disabled:hover:bg-transparent";

function MoveButton({ id, direction, disabled }: { id: number; direction: -1 | 1; disabled: boolean }) {
  return (
    <form action={moveHeroSlideAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        className={iconButtonClass}
        title={direction < 0 ? "Mover para antes" : "Mover para depois"}
      >
        {direction < 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      </button>
    </form>
  );
}

export default function HeroSlideRow({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateHeroSlideAction, undefined);

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={slide.id} />
          <HeroSlideFields slide={slide} />

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
              Fechar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-paper-200 bg-white px-3 py-2">
      <span className="w-5 text-center text-xs font-semibold text-slate-400">{index + 1}</span>
      {slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.imageUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-brand-900 text-white/60">
          <ImageOff size={14} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {slide.headline}
          {!slide.published && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">oculto</span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {slide.ctaLabel ? `${slide.ctaLabel} → ${slide.ctaHref}` : "sem botão"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <MoveButton id={slide.id} direction={-1} disabled={index === 0} />
        <MoveButton id={slide.id} direction={1} disabled={index === total - 1} />
        <button onClick={() => setEditing(true)} className={iconButtonClass} title="Editar">
          <Pencil size={13} />
        </button>
        <DeleteButton
          action={deleteHeroSlideAction}
          id={slide.id}
          confirmMessage={`Excluir o slide "${slide.headline}"? A imagem dele também será apagada.`}
        />
      </div>
    </div>
  );
}
