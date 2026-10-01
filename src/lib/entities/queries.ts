import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { entityKey } from "@/lib/entities/normalize";
import { ARTICLE_KINDS, type ArticleKind } from "@/lib/entities/kinds";
import { getHiddenKinds } from "@/lib/entities/visibility";
import { nameMasker } from "@/lib/entities/mask";

/**
 * Public reads for the people/places pages (/pessoas, /lugares). Hidden
 * entities never show up, and items of a sensitive kind (PRIVATE_KINDS) are
 * left out — see /dados-pessoais.
 */

export type EntityKind = "person" | "place";
const PAGE_SIZE = 60;

export async function listEntities(kind: EntityKind, q: string | undefined, page: number) {
  // Search on the folded key, so "Piumhy" finds "Piumhi" and "Motta" finds "Mota".
  const folded = q?.trim() ? entityKey(q, kind) : "";
  const where: Prisma.EntityWhereInput = {
    kind,
    hidden: false,
    mentionCount: { gt: 0 },
    ...(folded ? { key: { contains: folded } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.entity.count({ where }),
    prisma.entity.findMany({
      where,
      orderBy: [{ mentionCount: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, slug: true, mentionCount: true, firstDate: true, lastDate: true },
    }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type EntityMentionRow = {
  id: number;
  surface: string;
  honorific: string | null;
  role: string | null;
  article: { title: string; kind: string; summary: string; page: number };
  edition: { id: number; title: string; editionNumber: number | null; publishedAt: Date };
};

export async function getEntity(kind: EntityKind, slug: string) {
  const entity = await prisma.entity.findUnique({ where: { kind_slug: { kind, slug } } });
  if (!entity || entity.hidden || entity.mentionCount === 0) return null;

  const mentions = await prisma.entityMention.findMany({
    where: { entityId: entity.id, article: { edition: { deletedAt: null } } },
    select: {
      id: true,
      surface: true,
      honorific: true,
      role: true,
      article: {
        select: {
          title: true,
          kind: true,
          summary: true,
          page: true,
          edition: { select: { id: true, title: true, editionNumber: true, publishedAt: true } },
        },
      },
    },
  });
  const [mask, hiddenKinds] = await Promise.all([hiddenNamesMasker(), getHiddenKinds()]);
  const rows: EntityMentionRow[] = mentions
    .filter((m) => !hiddenKinds.has(m.article.kind))
    .map(({ article: { edition, title, summary, ...article }, ...m }) => ({
      ...m,
      article: { ...article, title: mask(title), summary: mask(summary) },
      edition,
    }))
    .sort((a, b) => a.edition.publishedAt.getTime() - b.edition.publishedAt.getTime());

  // Who else appears in the same items — the start of a family/social network.
  const related = await prisma.$queryRaw<{ name: string; slug: string; kind: string; n: bigint }[]>`
    SELECT e.name, e.slug, e.kind, COUNT(DISTINCT m2.articleId) AS n
    FROM entity_mentions m1
    JOIN entity_mentions m2 ON m2.articleId = m1.articleId AND m2.entityId <> m1.entityId
    JOIN entities e ON e.id = m2.entityId AND e.hidden = FALSE
    JOIN articles a ON a.id = m1.articleId AND a.kind NOT IN (${Prisma.join([...hiddenKinds])})
    JOIN editions ed ON ed.id = a.editionId AND ed.deletedAt IS NULL
    WHERE m1.entityId = ${entity.id}
    GROUP BY e.id, e.name, e.slug, e.kind
    ORDER BY n DESC, e.name
    LIMIT 30`;

  // Most frequent honorific and roles, for the header ("cap.", "aniversariante"…).
  const count = (values: (string | null)[]) =>
    [...values.filter(Boolean).reduce((m, v) => m.set(v!, (m.get(v!) ?? 0) + 1), new Map<string, number>())]
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);

  return {
    entity,
    mentions: rows,
    honorifics: count(rows.map((r) => r.honorific?.toLowerCase() ?? null)).slice(0, 3),
    roles: count(rows.map((r) => r.role?.toLowerCase() ?? null)).slice(0, 6),
    related: related.map((r) => ({ name: r.name, slug: r.slug, kind: r.kind as EntityKind, n: Number(r.n) })),
  };
}

/**
 * Public reads for /materias: newspaper items grouped by kind (notícia,
 * nascimento, anúncio…). Sensitive kinds (PRIVATE_KINDS, fixed) plus whatever
 * an admin additionally hid at /admin/materias never show up here, same rule
 * as the person/place pages.
 */

const ARTICLE_PAGE_SIZE = 30;

export async function listKindCounts(): Promise<{ kind: ArticleKind; count: number }[]> {
  const hidden = await getHiddenKinds();
  const rows = await prisma.article.groupBy({
    by: ["kind"],
    where: { kind: { notIn: [...hidden] }, edition: { deletedAt: null } },
    _count: { _all: true },
  });
  const counts = new Map(rows.map((r) => [r.kind, r._count._all]));
  return ARTICLE_KINDS.filter((k) => !hidden.has(k))
    .map((kind) => ({ kind, count: counts.get(kind) ?? 0 }))
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count);
}

export type ArticleListRow = {
  id: number;
  title: string;
  summary: string;
  page: number;
  edition: { id: number; title: string; editionNumber: number | null; publishedAt: Date };
};

export async function listArticlesByKind(kind: string, page: number) {
  if (!(ARTICLE_KINDS as readonly string[]).includes(kind)) return null;
  const hidden = await getHiddenKinds();
  if (hidden.has(kind)) return null;

  const where: Prisma.ArticleWhereInput = { kind, edition: { deletedAt: null } };
  const [total, items] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { edition: { publishedAt: "desc" } },
      skip: (page - 1) * ARTICLE_PAGE_SIZE,
      take: ARTICLE_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        summary: true,
        page: true,
        edition: { select: { id: true, title: true, editionNumber: true, publishedAt: true } },
      },
    }),
  ]);

  const mask = await hiddenNamesMasker();
  const rows: ArticleListRow[] = items.map((a) => ({ ...a, title: mask(a.title), summary: mask(a.summary) }));
  return { kind: kind as ArticleKind, total, pages: Math.max(1, Math.ceil(total / ARTICLE_PAGE_SIZE)), items: rows };
}

/** Masks every hidden entity's name and printed spellings ("[nome ocultado]"). */
async function hiddenNamesMasker() {
  const hidden = await prisma.entity.findMany({
    where: { hidden: true },
    select: { name: true, mentions: { select: { surface: true }, distinct: ["surface"] } },
  });
  return nameMasker(hidden.flatMap((e) => [e.name, ...e.mentions.map((m) => m.surface)]));
}
