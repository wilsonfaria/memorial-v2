import { FileText, Newspaper } from "lucide-react";

type Props = { editions: number; pages: number; transcribedPct: number };

const nf = new Intl.NumberFormat("pt-BR");

/** Dark brand panel beside the login form: real archive numbers on floating cards. */
export default function LoginShowcase({ editions, pages, transcribedPct }: Props) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, transcribedPct)) / 100) * circumference;

  return (
    <div className="relative hidden min-h-screen flex-1 overflow-hidden bg-brand-900 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
      <PixelCorner />

      <div className="relative mb-12 h-72 w-full max-w-md">
        <div className="absolute left-0 top-0 w-72 rounded-xl bg-white p-5 shadow-xl">
          <p className="mb-3 text-xs font-medium text-slate-500">Acervo</p>
          <div className="flex items-end gap-6">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Newspaper size={12} /> Edições
              </p>
              <p className="font-display text-3xl font-bold text-brand-900">{nf.format(editions)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <FileText size={12} /> Páginas
              </p>
              <p className="font-display text-3xl font-bold text-brand-900">{nf.format(pages)}</p>
            </div>
          </div>
          <svg viewBox="0 0 240 56" className="mt-4 h-14 w-full" aria-hidden>
            <polyline
              points="0,44 30,36 60,40 90,22 120,28 150,12 180,20 210,8 240,14"
              fill="none"
              className="stroke-brand-500"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points="0,50 30,46 60,48 90,38 120,42 150,32 180,36 210,28 240,30"
              fill="none"
              className="stroke-brand-200"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="absolute bottom-0 right-0 w-44 rounded-xl bg-white p-5 shadow-xl">
          <p className="mb-2 text-xs font-medium text-slate-500">Transcrição por IA</p>
          <div className="relative mx-auto h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={radius} fill="none" className="stroke-paper-100" strokeWidth="12" />
              {filled > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  className="stroke-brand-900"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${circumference}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400">Concluído</span>
              <span className="text-lg font-bold text-brand-900">{transcribedPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm text-center text-white">
        <h2 className="font-display text-2xl font-semibold">Preservando nossa história</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-200">
          Painel do Memorial do Jornal Alto São Francisco: acompanhe o acervo digitalizado, a transcrição e o que o
          público está lendo.
        </p>
      </div>
    </div>
  );
}

/** Scattered translucent squares in the bottom-left corner, like the reference. */
function PixelCorner() {
  const cells = [
    [0, 4, 0.18], [1, 4, 0.1], [2, 4, 0.14], [0, 3, 0.1], [1, 3, 0.22], [0, 2, 0.14], [3, 4, 0.08], [2, 3, 0.1],
    [1, 2, 0.08], [0, 1, 0.1], [4, 4, 0.06],
  ] as const;
  return (
    <div className="pointer-events-none absolute bottom-6 left-6" aria-hidden>
      <div className="relative h-28 w-28">
        {cells.map(([x, y, o]) => (
          <span
            key={`${x}-${y}`}
            className="absolute h-5 w-5 rounded-[3px] bg-white"
            style={{ left: x * 24, top: y * 24 - 0, opacity: o }}
          />
        ))}
      </div>
    </div>
  );
}
