"use client";

import { useActionState, useMemo, useState } from "react";
import { createEditionAction, type ActionState } from "@/lib/actions/edition-actions";
import { monthName } from "@/lib/format";

type MonthData = { id: number; month: number };
type YearData = { id: number; year: number; months: MonthData[] };
type DecadeData = { id: number; label: string; years: YearData[] };
type NewspaperData = { id: number; name: string; decades: DecadeData[] };

export default function EditionForm({ newspapers }: { newspapers: NewspaperData[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createEditionAction,
    undefined
  );

  const [newspaperId, setNewspaperId] = useState<number | "">(newspapers[0]?.id ?? "");
  const [decadeId, setDecadeId] = useState<number | "">("");
  const [yearId, setYearId] = useState<number | "">("");
  const [monthId, setMonthId] = useState<number | "">("");

  const decades = useMemo(
    () => newspapers.find((n) => n.id === newspaperId)?.decades ?? [],
    [newspapers, newspaperId]
  );
  const years = useMemo(
    () => decades.find((d) => d.id === decadeId)?.years ?? [],
    [decades, decadeId]
  );
  const months = useMemo(
    () => years.find((y) => y.id === yearId)?.months ?? [],
    [years, yearId]
  );

  if (newspapers.length === 0) {
    return <p className="text-sm text-slate-400">Cadastre um jornal antes de adicionar edições.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="monthId" value={monthId} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Jornal"
          value={newspaperId}
          onChange={(v) => {
            setNewspaperId(Number(v));
            setDecadeId("");
            setYearId("");
            setMonthId("");
          }}
          options={newspapers.map((n) => ({ value: n.id, label: n.name }))}
        />
        <Select
          label="Década"
          value={decadeId}
          onChange={(v) => {
            setDecadeId(Number(v));
            setYearId("");
            setMonthId("");
          }}
          options={decades.map((d) => ({ value: d.id, label: `Década de ${d.label}` }))}
        />
        <Select
          label="Ano"
          value={yearId}
          onChange={(v) => {
            setYearId(Number(v));
            setMonthId("");
          }}
          options={years.map((y) => ({ value: y.id, label: String(y.year) }))}
        />
        <Select
          label="Mês"
          value={monthId}
          onChange={(v) => setMonthId(Number(v))}
          options={months.map((m) => ({ value: m.id, label: monthName(m.month) }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-slate-500">Título da edição</span>
          <input
            name="title"
            type="text"
            required
            placeholder="Edição de 08/03/2023"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Nº da edição (opcional)</span>
          <input
            name="editionNumber"
            type="number"
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-slate-500">Data de publicação</span>
          <input
            name="publishedAt"
            type="date"
            required
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="font-medium text-slate-500">Arquivo PDF</span>
          <input
            name="file"
            type="file"
            accept="application/pdf"
            required
            className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-2 file:py-1 file:text-xs file:text-brand-700"
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !monthId}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Adicionar edição"}
      </button>
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | "";
  onChange: (value: string) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className="rounded-lg border border-brand-200 px-2 py-2 text-sm outline-none focus:border-brand-400 disabled:bg-slate-50"
      >
        <option value="" disabled>
          Selecione
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
