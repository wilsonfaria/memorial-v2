import { prisma } from "@/lib/prisma";
import { deleteNewspaperAction } from "@/lib/actions/newspaper-actions";
import PageHeader from "@/components/admin/PageHeader";
import AdminNewLink from "@/components/admin/AdminNewLink";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNewspapersPage() {
  const newspapers = await prisma.newspaper.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { decades: true } } },
  });

  return (
    <>
      <PageHeader
        title="Jornais"
        description="Os títulos cujo acervo este memorial hospeda. Cada jornal organiza suas edições em décadas, anos e meses."
        action={<AdminNewLink href="/admin/jornais/novo" label="Novo jornal" />}
      />

      <div className="flex flex-col gap-2">
        {newspapers.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum jornal cadastrado ainda.</p>
        )}
        {newspapers.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between rounded-lg border border-paper-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">{n.name}</p>
              <p className="text-xs text-slate-400">
                /{n.slug} · {n._count.decades} década(s)
              </p>
            </div>
            <form action={deleteNewspaperAction}>
              <input type="hidden" name="id" value={n.id} />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remover jornal"
              >
                <Trash2 size={15} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
