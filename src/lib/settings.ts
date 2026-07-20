import { prisma } from "@/lib/prisma";

export const DEFAULT_PRIMARY_COLOR = "#4f8ecb";
export const DEFAULT_CREDITS_TEXT =
  "Portal memorial digital desenvolvido por [nome do desenvolvedor/empresa].";

export async function getSiteSettings() {
  return prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      creditsText: DEFAULT_CREDITS_TEXT,
    },
  });
}
