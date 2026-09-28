import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EntityDetail from "@/components/entities/EntityDetail";
import { getEntity } from "@/lib/entities/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEntity("place", slug);
  if (!data) return {};
  const description = `${data.entity.name}: ${data.entity.mentionCount} menção(ões) no jornal Alto São Francisco.`;
  return { title: data.entity.name, description, openGraph: { title: data.entity.name, description } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEntity("place", slug);
  if (!data) notFound();
  return <EntityDetail data={data} />;
}
