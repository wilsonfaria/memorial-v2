import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CategoryTree from "@/components/admin/CategoryTree";

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
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-sm text-slate-500">
          Cadastre um jornal antes de criar categorias.
        </p>
        <Link href="/admin/jornais" className="text-sm font-medium text-brand-600 underline">
          Ir para Jornais
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-900">Categorias</h1>

      <div className="flex flex-col gap-8">
        {newspapers.map((np) => (
          <section key={np.id}>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">{np.name}</h2>
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
          </section>
        ))}
      </div>
    </div>
  );
}
