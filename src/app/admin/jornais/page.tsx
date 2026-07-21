import { prisma } from "@/lib/prisma";
import { deleteNewspaperAction } from "@/lib/actions/newspaper-actions";
import NewspaperForm from "./NewspaperForm";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNewspapersPage() {
  const newspapers = await prisma.newspaper.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { decades: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Jornais</h1>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Novo jornal</h2>
        <NewspaperForm />
      </div>

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
    </div>
  );
}
