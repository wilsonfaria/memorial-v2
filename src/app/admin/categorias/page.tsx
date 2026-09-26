import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CategoryTree from "@/components/admin/CategoryTree";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const newspapers = await prisma.newspaper.findMany({
    orderBy: { id: "asc" },
    include: {
      decades: {
        orderBy: { startYear: "desc" },
        include: {
          years: {
            orderBy: { year: "desc" },
            include: {
              months: {
                orderBy: { month: "asc" },
                include: { _count: { select: { editions: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (newspapers.length === 0) {
    return (
      <>
        <PageHeader title="Categorias" />
        <Card>
          <p className="mb-3 text-sm text-slate-500">
            Cadastre um jornal antes de criar categorias.
          </p>
          <Link href="/admin/jornais" className="text-sm font-medium text-brand-600 underline">
            Ir para Jornais
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Estrutura de navegação do acervo: décadas, anos e meses em que as edições são organizadas."
      />

      <div className="flex flex-col gap-6">
        {newspapers.map((np) => (
          <Card key={np.id} title={np.name}>
            <CategoryTree
              newspaperId={np.id}
              decades={np.decades.map((d) => ({
                id: d.id,
                label: d.label,
                startYear: d.startYear,
                years: d.years.map((y) => ({
                  id: y.id,
                  year: y.year,
                  months: y.months.map((m) => ({
                    id: m.id,
                    month: m.month,
                    editionCount: m._count.editions,
                  })),
                })),
              }))}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
