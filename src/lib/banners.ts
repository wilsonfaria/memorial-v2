import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getSiteSettings } from "@/lib/settings";
import { bannerStatus } from "@/lib/banner-status";

/**
 * Sponsor banner strip (above the footer on every page).
 *
 * Each page view asks POST /api/banners/view for a fresh selection: pinned
 * banners always (sorted by `order`), then eligible unpinned ones in random
 * order until SiteSetting.bannerSlots is filled. Every banner returned is
 * counted as one *appearance* — that's what maxAppearances caps, so a banner
 * with a cap simply stops being selected once it's used up. The client then
 * reports *views* (strip actually on screen) and clicks go through
 * /api/banners/[id]/click. Counters live on Sponsor (lifetime) and in
 * SponsorDailyStat (per day, for the admin charts).
 */

export type PublicBanner = { id: number; name: string; logoUrl: string; hasLink: boolean };

type Counter = "appearances" | "views" | "clicks";

/**
 * "YYYY-MM-DD" for a moment as seen in Brazil (UTC-3, no DST since 2019).
 * Daily stats are keyed by this rather than the DB's CURDATE() or the
 * host's local date — both of which are usually UTC and would roll the day
 * over at 21:00 local time.
 */
function siteDay(date = new Date()): string {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Adds 1 to `counter` for each id, both on the lifetime total and today's row. */
async function increment(counter: Counter, ids: number[]) {
  if (ids.length === 0) return;
  // Column names can't be bound parameters; `counter` is a closed union.
  const column = Prisma.raw(`\`${counter}\``);
  const today = siteDay();
  await prisma.$transaction([
    prisma.sponsor.updateMany({ where: { id: { in: ids } }, data: { [counter]: { increment: 1 } } }),
    prisma.$executeRaw`
      INSERT INTO sponsor_daily_stats (sponsorId, date, ${column})
      VALUES ${Prisma.join(ids.map((id) => Prisma.sql`(${id}, CAST(${today} AS DATE), 1)`))}
      ON DUPLICATE KEY UPDATE ${column} = ${column} + 1
    `,
  ]);
}

/** Picks the banners for one page view and counts them as appearances. */
export async function selectBannersForView(): Promise<PublicBanner[]> {
  const [settings, candidates] = await Promise.all([
    getSiteSettings(),
    prisma.sponsor.findMany({
      where: { active: true, deletedAt: null },
      orderBy: [{ order: "asc" }, { id: "asc" }],
    }),
  ]);

  const now = new Date();
  const eligible = candidates.filter((b) => bannerStatus(b, now) === "active");
  const pinned = eligible.filter((b) => b.pinned);
  const rotating = shuffle(eligible.filter((b) => !b.pinned));
  const freeSlots = Math.max(0, settings.bannerSlots - pinned.length);
  const selected = [...pinned, ...rotating.slice(0, freeSlots)];

  try {
    await increment("appearances", selected.map((b) => b.id));
  } catch {
    // Counting must never take the banners (or the page) down with it.
  }

  return selected.map((b) => ({ id: b.id, name: b.name, logoUrl: b.logoUrl, hasLink: Boolean(b.linkUrl) }));
}

/** Records that the strip holding these banners was actually on screen. */
export async function recordBannerViews(ids: number[]) {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 50);
  if (unique.length === 0) return;
  // Only count banners that exist and are live — ignore made-up ids.
  const existing = await prisma.sponsor.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true },
  });
  await increment("views", existing.map((b) => b.id));
}

/** Counts a click and returns where to send the visitor (null = no valid link). */
export async function recordBannerClick(id: number): Promise<string | null> {
  const banner = await prisma.sponsor.findFirst({ where: { id, deletedAt: null }, select: { linkUrl: true } });
  if (!banner?.linkUrl || !/^https?:\/\//i.test(banner.linkUrl)) return null;
  try {
    await increment("clicks", [id]);
  } catch {
    // Still send the visitor on even if counting failed.
  }
  return banner.linkUrl;
}

/** Last `days` days of summed counters across all banners (or one), oldest first, zero-filled. */
export async function getBannerDailyTotals(days: number, sponsorId?: number) {
  // Walk whole days (in UTC arithmetic) back from today's site date; a
  // @db.Date column comes back as UTC midnight, so keys line up exactly.
  const todayUtc = new Date(`${siteDay()}T00:00:00Z`);
  const keys = Array.from({ length: days }, (_, i) =>
    new Date(todayUtc.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const rows = await prisma.sponsorDailyStat.groupBy({
    by: ["date"],
    where: { date: { gte: new Date(`${keys[0]}T00:00:00Z`) }, ...(sponsorId ? { sponsorId } : {}) },
    _sum: { appearances: true, views: true, clicks: true },
  });
  const byDay = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r._sum]));

  return keys.map((key) => {
    const sum = byDay.get(key);
    return {
      date: key,
      appearances: sum?.appearances ?? 0,
      views: sum?.views ?? 0,
      clicks: sum?.clicks ?? 0,
    };
  });
}
