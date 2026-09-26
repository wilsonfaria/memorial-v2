import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import CharacterForm from "./CharacterForm";
import CharacterRow from "./CharacterRow";

export const dynamic = "force-dynamic";

export default async function AdminCharactersPage() {
  const characters = await prisma.character.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Personagens"
        description={
          <>
            Pessoas que marcaram a história do jornal e da região, exibidas em{" "}
            <code>/personagens</code>.
          </>
        }
      />

      <CreatePanel label="Novo personagem" title="Novo personagem">
        <CharacterForm />
      </CreatePanel>

      <div className="flex flex-col gap-1">
        {characters.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum personagem cadastrado ainda.</p>
        )}
        {characters.map((c) => (
          <CharacterRow key={c.id} character={c} />
        ))}
      </div>
    </>
  );
}
