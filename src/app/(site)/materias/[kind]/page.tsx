import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleKindList from "@/components/articles/ArticleKindList";
import { ARTICLE_KINDS, KIND_LABEL, isPrivateKind, type ArticleKind } from "@/lib/entities/kinds";

export const dynamic = "force-dynamic";

function labelFor(kind: string) {
  if (!(ARTICLE_KINDS as readonly string[]).includes(kind) || isPrivateKind(kind)) return null;
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
  if (!labelFor(kind)) notFound();
  const { p } = await searchParams;
  return <ArticleKindList kind={kind} page={Math.max(1, Number(p) || 1)} />;
}
