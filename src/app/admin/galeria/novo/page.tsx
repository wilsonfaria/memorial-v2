import AdminEditPage from "@/components/admin/AdminEditPage";
import AlbumForm from "../AlbumForm";

export default function NewAlbumPage() {
  return (
    <AdminEditPage title="Novo álbum" backHref="/admin/galeria">
      <AlbumForm />
    </AdminEditPage>
  );
}
