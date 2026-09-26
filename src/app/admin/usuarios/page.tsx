import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import CreatePanel from "@/components/admin/CreatePanel";
import UserForm from "./UserForm";
import UserRow from "./UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([
    getSession(),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem tem acesso a esta área administrativa. Cada usuário entra com o próprio login e pode ativar verificação em duas etapas."
      />

      <CreatePanel label="Novo usuário" title="Novo usuário">
        <UserForm />
      </CreatePanel>

      <div className="flex flex-col gap-1">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            isSelf={u.id === Number(session?.sub)}
            canDelete={u.id !== Number(session?.sub) && users.length > 1}
          />
        ))}
      </div>
    </>
  );
}
