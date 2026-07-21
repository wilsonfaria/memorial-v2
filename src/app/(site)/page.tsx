import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import EditionsView from "@/components/EditionsView";
import { getRecentEditions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const editions = await getRecentEditions(10);

  return (
    <>
      <Breadcrumb items={[{ label: "Início" }]} />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-900">Últimas edições</h1>
            <p className="text-sm text-slate-500">As 10 edições mais recentes do acervo digitalizado.</p>
          </div>
          <Link
            href="/edicoes"
            className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            Ver todas as edições
            <ArrowRight size={15} />
          </Link>
        </div>

        <EditionsView editions={editions} defaultMode="grid" showToggle={false} />
      </div>
    </>
  );
}
