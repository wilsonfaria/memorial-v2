import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import KindVisibilityRow from "./KindVisibilityRow";
import { ARTICLE_KINDS, KIND_LABEL, isPrivateKind } from "@/lib/entities/kinds";
import { getHiddenKinds } from "@/lib/entities/visibility";

export const dynamic = "force-dynamic";

export default async function AdminMateriasPage() {
  const [counts, hidden] = await Promise.all([
    prisma.article.groupBy({ by: ["kind"], _count: { _all: true } }),
    getHiddenKinds(),
  ]);
  const countByKind = new Map(counts.map((c) => [c.kind, c._count._all]));

  const rows = ARTICLE_KINDS.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    count: countByKind.get(kind) ?? 0,
    hidden: hidden.has(kind),
    locked: isPrivateKind(kind),
  })).sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title="Matérias por tipo"
        description={
          <>
            Controla o que aparece em <code>/materias</code> e nas fichas de <code>/pessoas</code> e{" "}
            <code>/lugares</code>. Ocultar um tipo não muda a transcrição nem o PDF — só tira esse tipo das páginas
            públicas de classificação. Doença, polícia, religião e política ficam sempre ocultas (LGPD), sem opção de
            mostrar.
          </>
        }
      />

      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <KindVisibilityRow key={row.kind} row={row} />
        ))}
      </div>
    </>
  );
}
