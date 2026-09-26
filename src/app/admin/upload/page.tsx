import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import UploadForm from "@/components/admin/UploadForm";

export const dynamic = "force-dynamic";

export default async function AdminUploadPage() {
  const newspapers = await prisma.newspaper.findMany({ orderBy: { id: "asc" } });

  return (
    <>
      <PageHeader
        title="Upload em massa"
        description={
          <>
            Envie uma pasta com a estrutura <strong>Década / Ano / Mês / arquivos.pdf</strong>. As
            categorias são criadas automaticamente e o número da edição é extraído do nome do
            arquivo.
          </>
        }
      />

      <Card>
        <UploadForm newspapers={newspapers} />
      </Card>
    </>
  );
}
