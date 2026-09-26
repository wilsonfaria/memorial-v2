"use client";

import { useActionState } from "react";
import { updateBannerSlotsAction, type ActionState } from "@/lib/actions/sponsor-actions";

export default function BannerSlotsForm({ bannerSlots }: { bannerSlots: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateBannerSlotsAction, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Banners por página</span>
        <input
          name="bannerSlots"
          type="number"
          min={1}
          max={50}
          defaultValue={bannerSlots}
          className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
    </form>
  );
}
