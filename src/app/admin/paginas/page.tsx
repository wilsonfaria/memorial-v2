import { prisma } from "@/lib/prisma";
import PageForm from "./PageForm";
import PageRow from "./PageRow";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { menuOrder: "asc" },
    include: { images: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-xl font-semibold text-brand-900">Páginas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Crie páginas de conteúdo livre (ex: Contato, História do Jornal, Seja um apoiador) e
        controle se aparecem no menu do site e se estão publicadas. A página fica disponível em{" "}
        <code>/&lt;endereço&gt;</code> assim que publicada.
      </p>

      <div className="mb-8 rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Nova página</h2>
        <PageForm />
      </div>

      <div className="flex flex-col gap-1">
        {pages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma página cadastrada ainda.</p>
        )}
        {pages.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </div>
    </div>
  );
}
