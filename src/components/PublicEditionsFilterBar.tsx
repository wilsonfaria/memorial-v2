"use client";

import { useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { TreeDecade } from "@/lib/data";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function PublicEditionsFilterBar({ tree }: { tree: TreeDecade[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const decadeParam = searchParams.get("decada") ?? "";
  const yearParam = searchParams.get("ano") ?? "";
  const monthParam = searchParams.get("mes") ?? "";

  const selectedDecade = useMemo(
    () => tree.find((d) => String(d.startYear) === decadeParam),
    [tree, decadeParam]
  );
  const yearOptions = useMemo(() => selectedDecade?.years ?? [], [selectedDecade]);
  const selectedYear = useMemo(
    () => yearOptions.find((y) => String(y.year) === yearParam),
    [yearOptions, yearParam]
  );
  const monthOptions = selectedYear?.months ?? [];

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateParamDebounced(key: string, value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ [key]: value }), 400);
  }

  const hasFilters = decadeParam || yearParam || monthParam || searchParams.get("q");

  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-900">Filtros</h2>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="text-xs font-medium text-slate-400 hover:text-accent-600"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Buscar por título/nº</span>
          <input
            type="text"
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => updateParamDebounced("q", e.target.value)}
            placeholder="Ex: Edição 343"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Década</span>
          <select
            value={decadeParam}
            onChange={(e) => updateParams({ decada: e.target.value, ano: "", mes: "" })}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Todas</option>
            {tree.map((d) => (
              <option key={d.id} value={d.startYear}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Ano</span>
          <select
            value={yearParam}
            onChange={(e) => updateParams({ ano: e.target.value, mes: "" })}
            disabled={!selectedDecade}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:opacity-40"
          >
            <option value="">Todos</option>
            {yearOptions.map((y) => (
              <option key={y.id} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Mês</span>
          <select
            value={monthParam}
            onChange={(e) => updateParams({ mes: e.target.value })}
            disabled={!selectedYear}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:opacity-40"
          >
            <option value="">Todos</option>
            {monthOptions.map((m) => (
              <option key={m.id} value={m.month}>
                {MONTH_NAMES[m.month - 1]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
