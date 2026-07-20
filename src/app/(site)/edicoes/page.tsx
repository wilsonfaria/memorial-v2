import EditionsView from "@/components/EditionsView";
import { getAllEditions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AllEditionsPage() {
  const editions = await getAllEditions();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-900">Todas as edições</h1>
        <p className="text-sm text-slate-500">
          {editions.length} edições digitalizadas no acervo.
        </p>
      </div>

      <EditionsView editions={editions} defaultMode="grid" />
    </div>
  );
}
