import { prisma } from "@/lib/prisma";
import EditionForm from "@/components/admin/EditionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteEditionAction } from "@/lib/actions/edition-actions";
import { formatDate, formatFileSize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminEditionsPage() {
  const [newspapers, editions] = await Promise.all([
    prisma.newspaper.findMany({
      orderBy: { id: "asc" },
      include: {
        decades: {
          orderBy: { startYear: "desc" },
          include: {
            years: {
              orderBy: { year: "desc" },
              include: { months: { orderBy: { month: "asc" } } },
            },
          },
        },
      },
    }),
    prisma.edition.findMany({
      orderBy: { publishedAt: "desc" },
      take: 100,
      include: { month: { include: { year: { include: { decade: true } } } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Edições</h1>

      <div className="mb-8 rounded-xl border border-brand-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Nova edição</h2>
        <EditionForm newspapers={newspapers} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="mb-1 text-xs text-slate-400">
          Mostrando as {editions.length} edições mais recentes.
        </p>
        {editions.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma edição cadastrada ainda.</p>
        )}
        {editions.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-brand-100 bg-white px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{e.title}</p>
              <p className="text-xs text-slate-400">
                {formatDate(e.publishedAt)} · {e.month.year.decade.label}s / {e.month.year.year} ·{" "}
                {formatFileSize(e.fileSizeBytes)}
                {e.editionNumber ? ` · nº ${e.editionNumber}` : ""}
              </p>
            </div>
            <DeleteButton
              action={deleteEditionAction}
              id={e.id}
              confirmMessage={`Remover a edição "${e.title}"? O PDF será apagado permanentemente.`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
