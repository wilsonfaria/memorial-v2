import { Sparkles } from "lucide-react";
import OnThisDayCard from "@/components/home/OnThisDayCard";
import type { OnThisDayEdition } from "@/lib/data";

const MONTH_DAY_LABEL = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });

export default function OnThisDaySection({ editions }: { editions: OnThisDayEdition[] }) {
  if (editions.length === 0) return null;

  const todayLabel = MONTH_DAY_LABEL.format(new Date());

  return (
    <div data-reveal className="home-on-this-day mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="home-eyebrow">O passado encontra o presente</p>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-brand-900">
            <Sparkles size={20} className="text-accent-500" />
            Há anos, em {todayLabel}
          </h2>
          <p className="text-sm text-slate-500">O que o jornal registrou nesta mesma data, ao longo do tempo.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
        {editions.map((edition) => (
          <OnThisDayCard key={edition.id} edition={edition} />
        ))}
      </div>
    </div>
  );
}
