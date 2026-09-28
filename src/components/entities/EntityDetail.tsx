import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import MentionTimeline, { type TimelineItem } from "@/components/entities/MentionTimeline";
import type { getEntity } from "@/lib/entities/queries";

type Data = NonNullable<Awaited<ReturnType<typeof getEntity>>>;

const BASE = { person: "/pessoas", place: "/lugares" } as const;
const INDEX_LABEL = { person: "Pessoas no jornal", place: "Lugares no jornal" } as const;

/** A person's or place's page: every mention in the archive, in time order, plus who appears alongside. */
export default function EntityDetail({ data }: { data: Data }) {
  const { entity, mentions, honorifics, roles, related } = data;
  const kind = entity.kind as "person" | "place";
  const from = entity.firstDate?.getUTCFullYear();
  const to = entity.lastDate?.getUTCFullYear();
  const spellings = [...new Set(mentions.map((m) => m.surface))].filter((s) => s !== entity.name);
  const people = related.filter((r) => r.kind === "person").slice(0, 16);
  const places = related.filter((r) => r.kind === "place").slice(0, 12);

  const items: TimelineItem[] = mentions.map((m) => ({
    id: m.id,
    surface: m.surface,
    honorific: m.honorific,
    role: m.role,
    title: m.article.title,
    kind: m.article.kind,
    summary: m.article.summary,
    page: m.article.page,
    editionId: m.edition.id,
    editionName: m.edition.editionNumber != null ? `Edição nº ${m.edition.editionNumber}` : m.edition.title,
    date: m.edition.publishedAt.toISOString(),
  }));

  return (
    <>
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: INDEX_LABEL[kind], href: BASE[kind] }, { label: entity.name }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold text-brand-900">
              {kind === "person" && honorifics[0] ? <span className="text-slate-400">{honorifics[0]} </span> : null}
              {entity.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {entity.mentionCount} {entity.mentionCount === 1 ? "menção" : "menções"} no jornal
              {from && ` · ${from === to ? from : `de ${from} a ${to}`}`}
            </p>
            {roles.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-paper-100 px-2 py-0.5 text-xs text-slate-600">
                    {r}
                  </span>
                ))}
              </p>
            )}
            {spellings.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">Também grafado: {spellings.slice(0, 8).join(", ")}</p>
            )}
            <p className="mb-8 mt-4 max-w-prose rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              Página montada automaticamente pela IA a partir das transcrições. Pessoas diferentes com o mesmo nome podem
              aparecer juntas, e a mesma pessoa pode estar separada se o jornal a citou de outra forma — confira sempre no
              jornal original.
            </p>

            <MentionTimeline items={items} />
          </div>

          <aside className="flex flex-col gap-6">
            {people.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-brand-900">
                  {kind === "person" ? "Aparece junto com" : "Pessoas citadas aqui"}
                </h2>
                <ul className="flex flex-col gap-1">
                  {people.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/pessoas/${r.slug}`} className="flex justify-between gap-2 text-sm text-brand-700 hover:underline">
                        <span className="truncate">{r.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{r.n}×</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {places.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-brand-900">Lugares nas mesmas notícias</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {places.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/lugares/${r.slug}`}
                        className="inline-block rounded-full bg-support-50 px-2 py-0.5 text-xs text-support-800 hover:bg-support-100"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
