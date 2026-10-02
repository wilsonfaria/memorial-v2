import AdminEditPage from "@/components/admin/AdminEditPage";
import CharacterForm from "../CharacterForm";

export default function NewCharacterPage() {
  return (
    <AdminEditPage
      title="Novo personagem"
      description="Cadastre a biografia, a foto e os dados de publicação em uma tela dedicada."
      backHref="/admin/personagens"
    >
      <CharacterForm />
    </AdminEditPage>
  );
}
