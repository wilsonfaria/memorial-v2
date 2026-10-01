import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedPageBySlug } from "@/lib/data";
import { sanitizePageHtml } from "@/lib/sanitize-html";
import { htmlToDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) return {};

  const description = htmlToDescription(page.body);
  return {
    title: page.title,
    description,
    openGraph: {
      title: page.title,
      description,
      type: "article",
      images: page.coverImageUrl ? [{ url: page.coverImageUrl }] : undefined,
    },
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);

  if (!page) notFound();

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: page.title }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {page.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.coverImageUrl}
            alt=""
            className="mb-6 h-64 w-full rounded-2xl object-cover"
          />
        )}

        <h1 className="mb-6 text-2xl font-semibold text-brand-900">{page.title}</h1>

        <div className="cms-content" dangerouslySetInnerHTML={{ __html: sanitizePageHtml(page.body) }} />

        {page.images.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {page.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt=""
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
