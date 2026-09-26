import { prisma } from "@/lib/prisma";

export async function getHomepageContent() {
  const existing = await prisma.homepageContent.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  // Same reasoning as getSiteSettings(): only reached once, ever.
  return prisma.homepageContent.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

/** Hero carousel slides in display order. Public site passes publishedOnly. */
export async function getHeroSlides({ publishedOnly = false } = {}) {
  return prisma.heroSlide.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
}
