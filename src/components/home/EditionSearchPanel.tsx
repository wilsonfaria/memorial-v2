"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { TreeDecade } from "@/lib/data";
import { monthName } from "@/lib/format";

type ChronicleOption = { slug: string; title: string };

const fieldClass =
  "w-full rounded-none border-0 border-b border-paper-200 bg-transparent px-0 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500 disabled:opacity-50";

export default function EditionSearchPanel({
  tree,
  chronicles,
}: {
  tree: TreeDecade[];
  chronicles: ChronicleOption[];
}) {
  const router = useRouter();
  const [decada, setDecada] = useState("");
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");
  const [edicao, setEdicao] = useState("");

  const years = useMemo(
    () => tree.find((d) => String(d.startYear) === decada)?.years ?? [],
    [tree, decada]
  );
  const months = useMemo(
    () => years.find((y) => String(y.year) === ano)?.months ?? [],
    [years, ano]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (decada) params.set("decada", decada);
    if (ano) params.set("ano", ano);
    if (mes) params.set("mes", mes);
    if (edicao) params.set("q", edicao);
    router.push(`/edicoes${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="edition-search rounded-xl border border-paper-200 bg-white p-5 shadow-lg sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-900">
        <Search size={18} className="text-accent-600" />
        Encontre uma edição
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 items-end gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Década">
          <select
            value={decada}
            onChange={(e) => {
              setDecada(e.target.value);
              setAno("");
              setMes("");
            }}
            className={fieldClass}
          >
            <option value="">Selecione a década</option>
            {tree.map((d) => (
              <option key={d.id} value={d.startYear}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ano">
          <select
            value={ano}
            onChange={(e) => {
              setAno(e.target.value);
              setMes("");
            }}
            disabled={!decada}
            className={fieldClass}
          >
            <option value="">Selecione o ano</option>
            {years.map((y) => (
              <option key={y.id} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mês">
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            disabled={!ano}
            className={fieldClass}
          >
            <option value="">Selecione o mês</option>
            {months.map((m) => (
              <option key={m.id} value={m.month}>
                {monthName(m.month)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Edição">
          <input
            type="text"
            value={edicao}
            onChange={(e) => setEdicao(e.target.value)}
            placeholder="Nº da edição"
            className={fieldClass}
          />
        </Field>

        <Field label="Crônicas">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) router.push(`/cronicas/${e.target.value}`);
            }}
            className={fieldClass}
          >
            <option value="">Todas as crônicas</option>
            {chronicles.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-900 px-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-800 sm:col-span-3 lg:col-span-1"
        >
          <Search size={15} />
          Buscar
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
