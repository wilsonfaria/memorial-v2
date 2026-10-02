import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import AdminNewLink from "@/components/admin/AdminNewLink";
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
        action={<AdminNewLink href="/admin/personagens/novo" label="Novo personagem" />}
      />

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
