import AdminEditPage from "@/components/admin/AdminEditPage";
import ChronicleForm from "../ChronicleForm";

export default function NewChroniclePage() {
  return (
    <AdminEditPage
      title="Nova crônica"
      description="Escreva e publique a crônica em uma tela ampla, sem abrir o formulário dentro da lista."
      backHref="/admin/cronicas"
    >
      <ChronicleForm />
    </AdminEditPage>
  );
}
