import AdminEditPage from "@/components/admin/AdminEditPage";
import PageForm from "../PageForm";

export default function NewPagePage() {
  return (
    <AdminEditPage
      title="Nova página"
      description="Crie a página e seu conteúdo em uma tela ampla, com acesso ao editor completo."
      backHref="/admin/paginas"
    >
      <PageForm />
    </AdminEditPage>
  );
}
