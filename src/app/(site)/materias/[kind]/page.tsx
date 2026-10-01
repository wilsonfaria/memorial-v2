import type { Metadata } from "next";
import ArticleKindList from "@/components/articles/ArticleKindList";
import { ARTICLE_KINDS, KIND_LABEL, type ArticleKind } from "@/lib/entities/kinds";

export const dynamic = "force-dynamic";

// Just a valid kind name — whether it's actually public (not LGPD-locked nor
// admin-hidden) is decided by listArticlesByKind, which 404s the page itself.
function labelFor(kind: string) {
  if (!(ARTICLE_KINDS as readonly string[]).includes(kind)) return null;
  return KIND_LABEL[kind as ArticleKind];
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const label = labelFor(kind);
  if (!label) return {};
  return { title: label, description: `${label}: matérias do jornal Alto São Francisco classificadas por tipo.` };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { kind } = await params;
  const { p } = await searchParams;
  return <ArticleKindList kind={kind} page={Math.max(1, Number(p) || 1)} />;
}
