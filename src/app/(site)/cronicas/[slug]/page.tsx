import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedChronicleBySlug } from "@/lib/data";
import { sanitizePageHtml } from "@/lib/sanitize-html";
import { htmlToDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const chronicle = await getPublishedChronicleBySlug(slug);
  if (!chronicle) return {};

  const description = chronicle.excerpt || htmlToDescription(chronicle.body);
  return {
    title: chronicle.title,
    description,
    openGraph: {
      title: chronicle.title,
      description,
      type: "article",
      images: chronicle.coverImageUrl ? [{ url: chronicle.coverImageUrl }] : undefined,
    },
  };
}

export default async function ChroniclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chronicle = await getPublishedChronicleBySlug(slug);
  if (!chronicle) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Crônicas", href: "/cronicas" },
          { label: chronicle.title },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 *:max-w-3xl">
        {chronicle.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chronicle.coverImageUrl} alt="" className="mb-6 h-64 w-full rounded-2xl object-cover" />
        )}

        <h1 className="mb-1 text-2xl font-semibold text-brand-900">{chronicle.title}</h1>
        <p className="mb-6 text-xs text-slate-400">
          {chronicle.authorName && `${chronicle.authorName} · `}
          {new Date(chronicle.publishedAt).toLocaleDateString("pt-BR")}
        </p>

        <div className="cms-content" dangerouslySetInnerHTML={{ __html: sanitizePageHtml(chronicle.body) }} />
      </div>
    </>
  );
}
