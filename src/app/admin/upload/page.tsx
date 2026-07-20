import { prisma } from "@/lib/prisma";
import UploadForm from "@/components/admin/UploadForm";

export default async function AdminUploadPage() {
  const newspapers = await prisma.newspaper.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-xl font-semibold text-brand-900">Upload em massa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Envie uma pasta com a estrutura <strong>Década / Ano / Mês / arquivos.pdf</strong>. As
        categorias (década, ano, mês) são criadas automaticamente e o número da edição é extraído
        do nome do arquivo.
      </p>

      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <UploadForm newspapers={newspapers} />
      </div>
    </div>
  );
}
