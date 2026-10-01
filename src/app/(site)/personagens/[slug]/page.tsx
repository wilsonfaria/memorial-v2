import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublishedCharacterBySlug } from "@/lib/data";
import { sanitizePageHtml } from "@/lib/sanitize-html";
import { htmlToDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const character = await getPublishedCharacterBySlug(slug);
  if (!character) return {};

  const description = character.role || htmlToDescription(character.bio);
  return {
    title: character.name,
    description,
    openGraph: {
      title: character.name,
      description,
      type: "profile",
      images: character.photoUrl ? [{ url: character.photoUrl }] : undefined,
    },
  };
}

export default async function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = await getPublishedCharacterBySlug(slug);
  if (!character) notFound();

  const years =
    character.bornYear || character.diedYear
      ? `${character.bornYear ?? "?"} — ${character.diedYear ?? "presente"}`
      : null;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Personagens", href: "/personagens" },
          { label: character.name },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 *:max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          {character.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.photoUrl} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="h-24 w-24 shrink-0 rounded-full bg-brand-100" />
          )}
          <div>
            <h1 className="text-2xl font-semibold text-brand-900">{character.name}</h1>
            {character.role && <p className="text-sm text-slate-500">{character.role}</p>}
            {years && <p className="text-xs text-slate-400">{years}</p>}
          </div>
        </div>

        <div className="cms-content" dangerouslySetInnerHTML={{ __html: sanitizePageHtml(character.bio) }} />
      </div>
    </>
  );
}
