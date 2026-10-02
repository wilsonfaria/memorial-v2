import AdminEditPage from "@/components/admin/AdminEditPage";
import UserForm from "../UserForm";

export default function NewUserPage() {
  return (
    <AdminEditPage title="Novo usuário" backHref="/admin/usuarios">
      <UserForm />
    </AdminEditPage>
  );
}
