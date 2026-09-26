"use client";

import { useEffect, useState } from "react";

type Scale = "base" | "lg" | "xl";
const STORAGE_KEY = "memorial_font_scale";
const NEXT_SCALE: Record<Scale, Scale> = { base: "lg", lg: "xl", xl: "base" };

function readStoredScale(): Scale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "lg" || stored === "xl" ? stored : "base";
  } catch {
    // Private browsing / blocked storage just keeps the default scale.
    return "base";
  }
}

export default function FontSizeControl() {
  // Lazy initializer only ever runs client-side for this "use client" component's
  // own first render, so it's safe to touch localStorage here directly instead of
  // restoring it via a setState-in-effect (which lints as an anti-pattern).
  const [scale, setScale] = useState<Scale>(readStoredScale);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-scale", scale);
    try {
      localStorage.setItem(STORAGE_KEY, scale);
    } catch {
      // Per-viewer convenience only — fine to lose on failure.
    }
  }, [scale]);

  return (
    <div className="flex items-center gap-1 text-xs text-white/60">
      <button
        type="button"
        onClick={() => setScale((s) => NEXT_SCALE[s])}
        className="rounded px-1.5 py-0.5 font-semibold hover:bg-white/10 hover:text-white"
        title="Aumentar tamanho do texto"
      >
        A+
      </button>
      <button
        type="button"
        onClick={() => setScale("base")}
        className="rounded px-1.5 py-0.5 text-[11px] hover:bg-white/10 hover:text-white"
        title="Restaurar tamanho do texto"
      >
        A-
      </button>
    </div>
  );
}
