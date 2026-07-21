import Link from "next/link";
import { Eye, Download, Users } from "lucide-react";
import DailyBarChart from "@/components/admin/DailyBarChart";
import {
  getDailyEventCounts,
  getEventTotal,
  getTopEditions,
} from "@/lib/analytics-data";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = params.days === "60" ? 60 : 30;

  const [downloadsDaily, visitsDaily, downloadsTotal, viewsTotal, visitsTotal, topDownloaded, topViewed] =
    await Promise.all([
      getDailyEventCounts("EDITION_DOWNLOAD", days),
      getDailyEventCounts("SITE_VISIT", days),
      getEventTotal("EDITION_DOWNLOAD", days),
      getEventTotal("EDITION_VIEW", days),
      getEventTotal("SITE_VISIT", days),
      getTopEditions("EDITION_DOWNLOAD", days, 10),
      getTopEditions("EDITION_VIEW", days, 10),
    ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">Relatórios</h1>
          <p className="text-sm text-slate-500">
            Produtividade do acervo: aberturas, downloads e acessos ao site.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-paper-200 bg-white p-1">
          <PeriodLink days={30} active={days === 30} />
          <PeriodLink days={60} active={days === 60} />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard icon={<Eye size={16} />} label="Aberturas de edições" value={viewsTotal} />
        <StatCard icon={<Download size={16} />} label="Downloads" value={downloadsTotal} />
        <StatCard icon={<Users size={16} />} label="Acessos ao site" value={visitsTotal} />
      </div>

      <div className="mb-6 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Downloads por dia</h2>
        <p className="mb-3 text-xs text-slate-400">Últimos {days} dias</p>
        <DailyBarChart data={downloadsDaily} />
      </div>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Acessos ao site por dia</h2>
        <p className="mb-3 text-xs text-slate-400">Últimos {days} dias</p>
        <DailyBarChart data={visitsDaily} color="var(--color-brand-500)" trackColor="var(--color-brand-50)" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TopList title="Mais baixadas" items={topDownloaded} />
        <TopList title="Mais abertas" items={topViewed} />
      </div>
    </div>
  );
}

function PeriodLink({ days, active }: { days: number; active: boolean }) {
  return (
    <Link
      href={`/admin/relatorios?days=${days}`}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        active ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-brand-50"
      }`}
    >
      {days} dias
    </Link>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-brand-500">{icon}</div>
      <p className="text-2xl font-semibold text-brand-900">{value.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: { editionId: number; title: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {items.length === 0 && <p className="text-xs text-slate-400">Sem dados no período.</p>}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={item.editionId} className="flex items-center gap-2 text-xs">
            <span className="w-4 shrink-0 text-slate-300">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-slate-600">{item.title}</span>
            <span className="shrink-0 font-medium text-brand-700">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
