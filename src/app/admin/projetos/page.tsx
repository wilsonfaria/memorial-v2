import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import ProjectForm from "./ProjectForm";
import ProjectRow from "./ProjectRow";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" } });

  return (
    <>
      <PageHeader
        title="Projetos"
        description={
          <>
            Projetos e iniciativas do memorial, exibidos em <code>/projetos</code> — ex: o projeto
            de digitalização, pesquisa e documentação por trás do acervo.
          </>
        }
      />

      <CreatePanel label="Novo projeto" title="Novo projeto">
        <ProjectForm />
      </CreatePanel>

      <div className="flex flex-col gap-1">
        {projects.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum projeto cadastrado ainda.</p>
        )}
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}
