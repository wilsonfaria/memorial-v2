"use client";

import { useActionState, useState } from "react";
import { Pencil, Pin, PinOff, RotateCcw } from "lucide-react";
import {
  deleteSponsorAction,
  resetSponsorStatsAction,
  toggleSponsorPinAction,
  updateSponsorAction,
  type ActionState,
} from "@/lib/actions/sponsor-actions";
import { bannerStatus, BANNER_STATUS_LABEL, type BannerStatus } from "@/lib/banner-status";
import DeleteButton from "@/components/admin/DeleteButton";
import SponsorFields from "./SponsorFields";

type Banner = {
  id: number;
  name: string;
  logoUrl: string;
  linkUrl: string | null;
  order: number;
  active: boolean;
  pinned: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxAppearances: number | null;
  appearances: number;
  views: number;
  clicks: number;
};

const STATUS_CLASS: Record<BannerStatus, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  scheduled: "bg-sky-50 text-sky-700",
  ended: "bg-slate-100 text-slate-500",
  capped: "bg-amber-50 text-amber-700",
};

const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-100 hover:text-brand-700";

const fmt = new Intl.NumberFormat("pt-BR");
const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[4.5rem]">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-700">{value}</p>
    </div>
  );
}

export default function SponsorRow({ banner }: { banner: Banner }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSponsorAction, undefined);

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={banner.id} />
          <SponsorFields banner={banner} />

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

  const status = bannerStatus(banner);
  const ctr = banner.views > 0 ? `${((banner.clicks / banner.views) * 100).toFixed(1).replace(".", ",")}%` : "—";
  const capPct = banner.maxAppearances ? Math.min(100, (banner.appearances / banner.maxAppearances) * 100) : null;
  const period =
    banner.startsAt || banner.endsAt
      ? `${banner.startsAt ? fmtDate(banner.startsAt) : "…"} → ${banner.endsAt ? fmtDate(banner.endsAt) : "…"}`
      : "Sem período definido";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-paper-200 bg-white px-4 py-3 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.logoUrl} alt={banner.name} className="max-h-full max-w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
            <span className="truncate">{banner.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[status]}`}>
              {BANNER_STATUS_LABEL[status]}
            </span>
            {banner.pinned && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                <Pin size={10} /> Fixado · ordem {banner.order}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-400">
            {period}
            {banner.linkUrl ? ` · ${banner.linkUrl}` : " · sem link"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[8.5rem]">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Aparições</p>
          <p className="text-sm font-semibold tabular-nums text-slate-700">
            {fmt.format(banner.appearances)}
            <span className="font-normal text-slate-400">
              {banner.maxAppearances ? ` / ${fmt.format(banner.maxAppearances)}` : " / ∞"}
            </span>
          </p>
          {capPct !== null && (
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
              <div
                className={`h-full rounded-full ${capPct >= 100 ? "bg-amber-500" : "bg-brand-500"}`}
                style={{ width: `${capPct}%` }}
              />
            </div>
          )}
        </div>
        <Stat label="Exibições" value={fmt.format(banner.views)} />
        <Stat label="Cliques" value={fmt.format(banner.clicks)} />
        <Stat label="CTR" value={ctr} />

        <div className="flex items-center gap-1">
          <form action={toggleSponsorPinAction}>
            <input type="hidden" name="id" value={banner.id} />
            <button type="submit" className={iconButtonClass} title={banner.pinned ? "Desafixar" : "Fixar"}>
              {banner.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
          </form>
          <form
            action={resetSponsorStatsAction}
            onSubmit={(e) => {
              if (!window.confirm(`Zerar aparições, exibições e cliques de "${banner.name}"? O histórico diário também será apagado.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={banner.id} />
            <button type="submit" className={iconButtonClass} title="Zerar contadores">
              <RotateCcw size={13} />
            </button>
          </form>
          <button onClick={() => setEditing(true)} className={iconButtonClass} title="Editar">
            <Pencil size={13} />
          </button>
          <DeleteButton
            action={deleteSponsorAction}
            id={banner.id}
            confirmMessage={`Mover o banner "${banner.name}" para a lixeira?`}
          />
        </div>
      </div>
    </div>
  );
}
