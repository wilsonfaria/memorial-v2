"use client";

import { useActionState } from "react";
import { CalendarHeart, Newspaper } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { findEditionByDateAction, type BirthdayLookupState } from "@/lib/actions/edition-lookup-actions";
import { formatDate } from "@/lib/format";

export default function BirthdayFinder() {
  const [state, action, pending] = useActionState<BirthdayLookupState, FormData>(
    findEditionByDateAction,
    undefined
  );
  const { openEdition } = useEditionModal();

  const result = state && "editionId" in state ? state : null;
  const error = state && "error" in state ? state.error : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 rounded-2xl border border-paper-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <CalendarHeart size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Qual jornal saiu no dia em que você nasceu?</h2>
            <p className="text-sm text-slate-500">Digite uma data e encontramos a edição mais próxima no acervo.</p>
          </div>
        </div>

        <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="date"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {pending ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <button
          onClick={() => openEdition(result.editionId)}
          className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-left hover:border-accent-300"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            {result.thumbnailPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads/${result.thumbnailPath}`}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <Newspaper size={22} className="text-support-400" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-brand-900">{result.title}</span>
            <span className="block text-xs text-slate-500">
              {formatDate(new Date(result.publishedAt))}
              {result.exact
                ? " · exatamente essa data"
                : ` · edição disponível mais próxima (${result.daysDiff} dia${result.daysDiff === 1 ? "" : "s"} de diferença)`}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-accent-600">Abrir edição</span>
        </button>
      )}
    </div>
  );
}
