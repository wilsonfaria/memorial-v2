import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import UserForm from "./UserForm";
import UserRow from "./UserRow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([
    getSession(),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Usuários</h1>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Novo usuário</h2>
        <UserForm />
      </div>

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
    </div>
  );
}
