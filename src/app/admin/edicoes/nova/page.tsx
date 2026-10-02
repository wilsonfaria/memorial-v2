import { prisma } from "@/lib/prisma";
import AdminEditPage from "@/components/admin/AdminEditPage";
import EditionForm from "@/components/admin/EditionForm";

export const dynamic = "force-dynamic";

export default async function NewEditionPage() {
  const newspapers = await prisma.newspaper.findMany({
    orderBy: { id: "asc" },
    include: {
      decades: {
        orderBy: { startYear: "desc" },
        include: {
          years: {
            orderBy: { year: "desc" },
            include: { months: { orderBy: { month: "asc" } } },
          },
        },
      },
    },
  });

  return (
    <AdminEditPage title="Nova edição" backHref="/admin/edicoes">
      <EditionForm newspapers={newspapers} />
    </AdminEditPage>
  );
}
