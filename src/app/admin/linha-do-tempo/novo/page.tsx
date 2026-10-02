import AdminEditPage from "@/components/admin/AdminEditPage";
import MilestoneForm from "../MilestoneForm";

export default function NewMilestonePage() {
  return (
    <AdminEditPage title="Novo marco histórico" backHref="/admin/linha-do-tempo">
      <MilestoneForm />
    </AdminEditPage>
  );
}
