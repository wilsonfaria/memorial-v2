import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import MilestoneForm from "./MilestoneForm";
import MilestoneRow from "./MilestoneRow";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  const milestones = await prisma.timelineMilestone.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: "asc" }, { order: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Linha do Tempo"
        description={
          <>
            Marcos históricos exibidos na home e em <code>/linha-do-tempo</code> — conteúdo
            editorial, independente das edições digitalizadas do acervo.
          </>
        }
      />

      <CreatePanel label="Novo marco" title="Novo marco">
        <MilestoneForm />
      </CreatePanel>

      <div className="flex flex-col gap-1">
        {milestones.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum marco cadastrado ainda.</p>
        )}
        {milestones.map((m) => (
          <MilestoneRow key={m.id} milestone={m} />
        ))}
      </div>
    </>
  );
}
