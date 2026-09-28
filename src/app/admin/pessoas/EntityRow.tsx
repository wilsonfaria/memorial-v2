"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, ExternalLink, MapPin, User } from "lucide-react";
import { setEntityHiddenAction } from "@/lib/actions/entity-actions";

type Entity = {
  id: number;
  kind: "person" | "place";
  name: string;
  slug: string;
  mentionCount: number;
  totalMentions: number;
  hidden: boolean;
  hiddenAt: Date | null;
  hiddenNote: string | null;
};

const BASE = { person: "/pessoas", place: "/lugares" } as const;

export default function EntityRow({ entity }: { entity: Entity }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const Icon = entity.kind === "person" ? User : MapPin;
  const privateMentions = entity.totalMentions - entity.mentionCount;

  function submit(hidden: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await setEntityHiddenAction(entity.id, hidden, note);
      if (!r.ok) return setError(r.error);
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className={`rounded-lg border px-4 py-2.5 ${entity.hidden ? "border-amber-200 bg-amber-50/60" : "border-paper-200 bg-white"}`}>
      <div className="flex items-center gap-3">
        <Icon size={15} className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {entity.name}
            {entity.hidden && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                oculta
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-400">
            {entity.mentionCount} {entity.mentionCount === 1 ? "menção pública" : "menções públicas"}
            {privateMentions > 0 && ` · ${privateMentions} em matérias sensíveis (fora do site)`}
            {entity.hidden && entity.hiddenAt && ` · ocultada em ${new Date(entity.hiddenAt).toLocaleString("pt-BR")}`}
          </p>
          {entity.hidden && entity.hiddenNote && (
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-amber-900">{entity.hiddenNote}</p>
          )}
        </div>
        {!entity.hidden && entity.mentionCount > 0 && (
          <a
            href={`${BASE[entity.kind]}/${entity.slug}`}
            target="_blank"
            rel="noreferrer"
            title="Ver no site"
            className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
          >
            <ExternalLink size={14} />
          </a>
        )}
        {entity.hidden ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(false)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50"
          >
            <Eye size={13} /> Mostrar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
          >
            <EyeOff size={13} /> Ocultar
          </button>
        )}
      </div>

      {open && !entity.hidden && (
        <div className="mt-3 flex flex-col gap-2 border-t border-paper-200 pt-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-500">Observação (quem pediu, quando, por onde)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ex.: pedido da neta, Maria Souza, pelo Fale Conosco em 28/09/2026"
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(true)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pending ? "Ocultando…" : "Ocultar ficha"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-paper-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {!open && error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
