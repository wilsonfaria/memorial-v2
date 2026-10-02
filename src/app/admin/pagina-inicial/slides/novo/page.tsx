import AdminEditPage from "@/components/admin/AdminEditPage";
import HeroSlideForm from "../../HeroSlideForm";

export default function NewHeroSlidePage() {
  return (
    <AdminEditPage title="Novo slide da página inicial" backHref="/admin/pagina-inicial">
      <HeroSlideForm />
    </AdminEditPage>
  );
}
