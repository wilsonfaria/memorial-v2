import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import CharacterRow from "../CharacterRow";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = await prisma.character.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!character) notFound();

  return (
    <AdminEditPage title={`Editar personagem: ${character.name}`} backHref="/admin/personagens">
      <CharacterRow character={character} editing />
    </AdminEditPage>
  );
}
