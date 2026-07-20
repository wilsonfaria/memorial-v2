import { notFound } from "next/navigation";
import Link from "next/link";
import EditionsView from "@/components/EditionsView";
import { getEditionsForMonth, getMonthBreadcrumb } from "@/lib/data";
import { monthName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monthId = Number(id);
  if (!Number.isFinite(monthId)) notFound();

  const month = await getMonthBreadcrumb(monthId);
  if (!month) notFound();

  const editions = await getEditionsForMonth(monthId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <span>Década de {month.year.decade.label}</span>
        <span>/</span>
        <span>{month.year.year}</span>
      </nav>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-900">
          {monthName(month.month)} de {month.year.year}
        </h1>
        <p className="text-sm text-slate-500">{editions.length} edições neste mês.</p>
      </div>

      {editions.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Nenhuma edição cadastrada para este mês ainda.{" "}
          <Link href="/edicoes" className="text-brand-600 underline">
            Ver todas as edições
          </Link>
          .
        </p>
      ) : (
        <EditionsView editions={editions} defaultMode="grid" />
      )}
    </div>
  );
}
