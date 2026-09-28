import type { Metadata } from "next";
import EntityIndex from "@/components/entities/EntityIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pessoas no jornal",
  description: "Pessoas citadas no jornal Alto São Francisco, com todas as menções ao longo dos anos.",
  // Out of search engines (LGPD — see /dados-pessoais); /lugares stays indexed.
  robots: { index: false, follow: true },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const { q, p } = await searchParams;
  return <EntityIndex kind="person" q={q} page={Math.max(1, Number(p) || 1)} />;
}
