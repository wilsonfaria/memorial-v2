import { prisma } from "@/lib/prisma";

export const DEFAULT_BACKGROUND_COLOR = "#f7f8fb";
export const DEFAULT_PRIMARY_COLOR = "#1D3F91";
export const DEFAULT_ACCENT_COLOR = "#3B62D6";
export const DEFAULT_SECONDARY_COLOR = "#3A5FA0";
export const DEFAULT_SUPPORT_COLOR = "#9AB4E0";
export const DEFAULT_CREDITS_TEXT =
  "Portal memorial digital desenvolvido por [nome do desenvolvedor/empresa].";

export async function getSiteSettings() {
  const existing = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  // Only reached once, ever (first request after the table is created) —
  // every subsequent call is a plain read. Doing an upsert (write) on every
  // page view was hammering the DB with an UPDATE per request, which under
  // concurrent public traffic on shared hosting risked lock/pool timeouts
  // and took down every (site) page (getSiteSettings runs in the shared layout).
  return prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      accentColor: DEFAULT_ACCENT_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      supportColor: DEFAULT_SUPPORT_COLOR,
      creditsText: DEFAULT_CREDITS_TEXT,
    },
  });
}
