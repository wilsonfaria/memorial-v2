import AdminEditPage from "@/components/admin/AdminEditPage";
import SponsorForm from "../SponsorForm";

export default function NewSponsorPage() {
  return (
    <AdminEditPage title="Novo banner" backHref="/admin/patrocinadores">
      <SponsorForm />
    </AdminEditPage>
  );
}
