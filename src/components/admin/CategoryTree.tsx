"use client";

import { useActionState, useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import {
  createDecadeAction,
  createYearAction,
  createMonthAction,
  deleteDecadeAction,
  deleteYearAction,
  deleteMonthAction,
  type ActionState,
} from "@/lib/actions/category-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { monthName } from "@/lib/format";

type MonthData = { id: number; month: number; editionCount: number };
type YearData = { id: number; year: number; months: MonthData[] };
type DecadeData = { id: number; label: string; startYear: number; years: YearData[] };

export default function CategoryTree({
  newspaperId,
  decades,
}: {
  newspaperId: number;
  decades: DecadeData[];
}) {
  return (
    <div>
      <DecadeForm newspaperId={newspaperId} />
      <ul className="mt-3 flex flex-col gap-1">
        {decades.map((decade) => (
          <DecadeNode key={decade.id} decade={decade} />
        ))}
        {decades.length === 0 && (
          <p className="py-3 text-sm text-slate-400">Nenhuma década cadastrada ainda.</p>
        )}
      </ul>
    </div>
  );
}

function DecadeForm({ newspaperId }: { newspaperId: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createDecadeAction,
    undefined
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="newspaperId" value={newspaperId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Ano inicial da década</span>
        <input
          name="startYear"
          type="number"
          required
          placeholder="2020"
          className="w-28 rounded-lg border border-brand-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        <Plus size={13} />
        Nova década
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function DecadeNode({ decade }: { decade: DecadeData }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-paper-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          <ChevronRight size={14} className={`text-brand-400 transition-transform ${open ? "rotate-90" : ""}`} />
          Década de {decade.label}
        </button>
        <DeleteButton
          action={deleteDecadeAction}
          id={decade.id}
          confirmMessage={`Remover a década de ${decade.label}? Todos os anos, meses e edições (incluindo PDFs) dentro dela serão apagados.`}
        />
      </div>
      {open && (
        <div className="border-t border-paper-100 px-3 py-2 pl-6">
          <YearForm decadeId={decade.id} />
          <ul className="mt-2 flex flex-col gap-1">
            {decade.years.map((year) => (
              <YearNode key={year.id} year={year} />
            ))}
            {decade.years.length === 0 && (
              <p className="py-1 text-xs text-slate-400">Nenhum ano cadastrado nesta década.</p>
            )}
          </ul>
        </div>
      )}
    </li>
  );
}

function YearForm({ decadeId }: { decadeId: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createYearAction,
    undefined
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="decadeId" value={decadeId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Ano</span>
        <input
          name="year"
          type="number"
          required
          className="w-24 rounded-lg border border-brand-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-200 disabled:opacity-60"
      >
        <Plus size={13} />
        Novo ano
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function YearNode({ year }: { year: YearData }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-paper-100 bg-brand-50/40">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-slate-600"
        >
          <ChevronRight size={13} className={`text-brand-400 transition-transform ${open ? "rotate-90" : ""}`} />
          {year.year}
        </button>
        <DeleteButton
          action={deleteYearAction}
          id={year.id}
          confirmMessage={`Remover o ano ${year.year}? Todos os meses e edições (incluindo PDFs) dentro dele serão apagados.`}
        />
      </div>
      {open && (
        <div className="border-t border-paper-200/60 px-3 py-2 pl-6">
          <MonthForm yearId={year.id} />
          <ul className="mt-2 flex flex-col gap-1">
            {year.months.map((month) => (
              <li
                key={month.id}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-white"
              >
                <span>
                  {monthName(month.month)}{" "}
                  <span className="text-slate-400">({month.editionCount} edições)</span>
                </span>
                <DeleteButton
                  action={deleteMonthAction}
                  id={month.id}
                  confirmMessage={`Remover ${monthName(month.month)}? As edições (incluindo PDFs) deste mês serão apagadas.`}
                />
              </li>
            ))}
            {year.months.length === 0 && (
              <p className="py-1 text-xs text-slate-400">Nenhum mês cadastrado neste ano.</p>
            )}
          </ul>
        </div>
      )}
    </li>
  );
}

function MonthForm({ yearId }: { yearId: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createMonthAction,
    undefined
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="yearId" value={yearId} />
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Mês</span>
        <select
          name="month"
          required
          defaultValue=""
          className="w-36 rounded-lg border border-brand-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
        >
          <option value="" disabled>
            Selecione
          </option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
      >
        <Plus size={13} />
        Novo mês
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
