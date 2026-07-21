"use client";

import { useMemo, useState } from "react";

type Point = { date: string; count: number };

function formatShortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function DailyBarChart({
  data,
  color = "var(--color-brand-600)",
  trackColor = "var(--color-brand-100)",
}: {
  data: Point[];
  color?: string;
  trackColor?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const width = 720;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 2;
  const barW = data.length > 0 ? chartW / data.length - barGap : 0;

  // Show roughly 6 date labels across the range to avoid collisions.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  const hovered = hover != null ? data[hover] : null;
  const tooltipX = useMemo(() => {
    if (hover == null) return 0;
    return padding.left + hover * (barW + barGap) + barW / 2;
  }, [hover, barW, padding.left]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Gráfico de barras por dia"
      >
        {/* recessive baseline */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--color-brand-100)"
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const barH = max > 0 ? (d.count / max) * chartH : 0;
          const x = padding.left + i * (barW + barGap);
          const y = height - padding.bottom - barH;
          const isHovered = hover === i;
          return (
            <g key={d.date}>
              <rect x={x} y={padding.top} width={barW} height={chartH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={Math.max(barW, 1)}
                height={Math.max(barH, 1)}
                rx={Math.min(3, barW / 2)}
                fill={isHovered ? color : d.count > 0 ? color : trackColor}
                opacity={d.count === 0 ? 0.5 : isHovered ? 1 : 0.85}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize={9}
                >
                  {formatShortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-paper-200 bg-white px-2 py-1 text-xs shadow-md"
          style={{ left: `${(tooltipX / width) * 100}%`, top: 4 }}
        >
          <span className="font-medium text-slate-700">{hovered.count}</span>{" "}
          <span className="text-slate-400">{formatShortDate(hovered.date)}</span>
        </div>
      )}
    </div>
  );
}
