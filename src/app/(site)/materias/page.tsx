import type { Metadata } from "next";
import ArticleKindIndex from "@/components/articles/ArticleKindIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matérias por tipo",
  description: "Notícias, nascimentos, anúncios, crônicas e outros tipos de matéria do jornal Alto São Francisco, classificados automaticamente.",
};

export default function Page() {
  return <ArticleKindIndex />;
}
