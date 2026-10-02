import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import AdminNewLink from "@/components/admin/AdminNewLink";
import PageRow from "./PageRow";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    where: { deletedAt: null },
    orderBy: { menuOrder: "asc" },
    include: { images: { orderBy: { order: "asc" } } },
  });

  return (
    <>
      <PageHeader
        title="Páginas"
        description={
          <>
            Páginas de conteúdo livre (ex: Contato, História do Jornal, Seja um apoiador). Ficam
            disponíveis em <code>/&lt;endereço&gt;</code> assim que publicadas.
          </>
        }
        action={<AdminNewLink href="/admin/paginas/novo" label="Nova página" />}
      />

      <div className="flex flex-col gap-1">
        {pages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma página cadastrada ainda.</p>
        )}
        {pages.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </div>
    </>
  );
}
