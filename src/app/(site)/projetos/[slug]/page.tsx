import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedProjectBySlug } from "@/lib/data";
import { sanitizePageHtml } from "@/lib/sanitize-html";
import { htmlToDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return {};

  const description = project.summary || htmlToDescription(project.body);
  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      type: "article",
      images: project.coverImageUrl ? [{ url: project.coverImageUrl }] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Projetos", href: "/projetos" },
          { label: project.title },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 *:max-w-3xl">
        {project.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl} alt="" className="mb-6 h-64 w-full rounded-2xl object-cover" />
        )}

        <h1 className="mb-6 text-2xl font-semibold text-brand-900">{project.title}</h1>

        <div className="cms-content" dangerouslySetInnerHTML={{ __html: sanitizePageHtml(project.body) }} />
      </div>
    </>
  );
}
