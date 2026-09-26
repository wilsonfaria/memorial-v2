import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import ChronicleForm from "./ChronicleForm";
import ChronicleRow from "./ChronicleRow";

export const dynamic = "force-dynamic";

export default async function AdminChroniclesPage() {
  const chronicles = await prisma.chronicle.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="Crônicas"
        description={
          <>
            Histórias e crônicas editoriais exibidas em <code>/cronicas</code>. A ordem define a
            sequência de exibição quando empatada por data.
          </>
        }
      />

      <CreatePanel label="Nova crônica" title="Nova crônica">
        <ChronicleForm />
      </CreatePanel>

      <div className="flex flex-col gap-1">
        {chronicles.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma crônica cadastrada ainda.</p>
        )}
        {chronicles.map((c) => (
          <ChronicleRow key={c.id} chronicle={c} />
        ))}
      </div>
    </>
  );
}
