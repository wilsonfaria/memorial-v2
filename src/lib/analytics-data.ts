import { prisma } from "@/lib/prisma";
import type { AnalyticsEventType } from "@/generated/prisma/client";

export type DailyCount = { date: string; count: number };

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getDailyEventCounts(type: AnalyticsEventType, days: number): Promise<DailyCount[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE(createdAt) as day, COUNT(*) as count
    FROM analytics_events
    WHERE type = ${type} AND createdAt >= ${since}
    GROUP BY DATE(createdAt)
    ORDER BY day ASC
  `;

  const byDay = new Map(rows.map((r) => [formatDateKey(new Date(r.day)), Number(r.count)]));

  const result: DailyCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = formatDateKey(d);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

export async function getEventTotal(type: AnalyticsEventType, days: number): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  return prisma.analyticsEvent.count({ where: { type, createdAt: { gte: since } } });
}

export type TopEdition = { editionId: number; title: string; count: number };

export async function getTopEditions(
  type: AnalyticsEventType,
  days: number,
  limit = 10
): Promise<TopEdition[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.$queryRaw<{ editionId: number; count: bigint }[]>`
    SELECT editionId, COUNT(*) as count
    FROM analytics_events
    WHERE type = ${type} AND editionId IS NOT NULL AND createdAt >= ${since}
    GROUP BY editionId
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  if (rows.length === 0) return [];

  const editions = await prisma.edition.findMany({
    where: { id: { in: rows.map((r) => r.editionId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(editions.map((e) => [e.id, e.title]));

  return rows.map((r) => ({
    editionId: r.editionId,
    title: titleById.get(r.editionId) ?? `Edição #${r.editionId}`,
    count: Number(r.count),
  }));
}
