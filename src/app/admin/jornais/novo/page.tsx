import AdminEditPage from "@/components/admin/AdminEditPage";
import NewspaperForm from "../NewspaperForm";

export default function NewNewspaperPage() {
  return (
    <AdminEditPage title="Novo jornal" backHref="/admin/jornais">
      <NewspaperForm />
    </AdminEditPage>
  );
}
