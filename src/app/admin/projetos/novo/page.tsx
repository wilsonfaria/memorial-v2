import AdminEditPage from "@/components/admin/AdminEditPage";
import ProjectForm from "../ProjectForm";

export default function NewProjectPage() {
  return (
    <AdminEditPage
      title="Novo projeto"
      description="Cadastre o conteúdo, a capa e as opções de publicação em uma tela dedicada."
      backHref="/admin/projetos"
    >
      <ProjectForm />
    </AdminEditPage>
  );
}
