"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Newspaper = { id: number; name: string };

export default function EditionsFilterBar({
  newspapers,
  years,
}: {
  newspapers: Newspaper[];
  years: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateParamDebounced(key: string, value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam(key, value), 400);
  }

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Jornal</span>
        <select
          defaultValue={searchParams.get("newspaperId") ?? ""}
          onChange={(e) => updateParam("newspaperId", e.target.value)}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">Todos</option>
          {newspapers.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Ano</span>
        <select
          defaultValue={searchParams.get("year") ?? ""}
          onChange={(e) => updateParam("year", e.target.value)}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">Todos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Mês</span>
        <select
          defaultValue={searchParams.get("month") ?? ""}
          onChange={(e) => updateParam("month", e.target.value)}
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          <option value="">Todos</option>
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Buscar por título/nº</span>
        <input
          type="text"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateParamDebounced("q", e.target.value)}
          placeholder="Ex: Edição 343"
          className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {(searchParams.get("newspaperId") || searchParams.get("year") || searchParams.get("month") || searchParams.get("q")) && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-brand-100"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
