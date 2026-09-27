import { prisma } from "@/lib/prisma";
import { deletePdfFile } from "@/lib/storage";
import { deleteEditionThumbnail } from "@/lib/thumbnail";
import { reindexFromDatabase, unindexEditions } from "@/lib/search/indexer";
import { TRASH_RETENTION_DAYS, type TrashResource, type TrashedItem } from "@/lib/trash-shared";

export * from "@/lib/trash-shared";

export async function getTrashedItems(): Promise<TrashedItem[]> {
  const [chronicles, characters, pages, projects, albums, milestones, editions, sponsors] = await Promise.all([
    prisma.chronicle.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.character.findMany({ where: { deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true } }),
    prisma.page.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.project.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.galleryAlbum.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.timelineMilestone.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.edition.findMany({ where: { deletedAt: { not: null } }, select: { id: true, title: true, deletedAt: true } }),
    prisma.sponsor.findMany({ where: { deletedAt: { not: null } }, select: { id: true, name: true, deletedAt: true } }),
  ]);

  const items: TrashedItem[] = [
    ...chronicles.map((c) => ({ resource: "chronicle" as const, id: c.id, title: c.title, deletedAt: c.deletedAt! })),
    ...characters.map((c) => ({ resource: "character" as const, id: c.id, title: c.name, deletedAt: c.deletedAt! })),
    ...pages.map((p) => ({ resource: "page" as const, id: p.id, title: p.title, deletedAt: p.deletedAt! })),
    ...projects.map((p) => ({ resource: "project" as const, id: p.id, title: p.title, deletedAt: p.deletedAt! })),
    ...albums.map((a) => ({ resource: "galleryAlbum" as const, id: a.id, title: a.title, deletedAt: a.deletedAt! })),
    ...milestones.map((m) => ({ resource: "timelineMilestone" as const, id: m.id, title: m.title, deletedAt: m.deletedAt! })),
    ...editions.map((e) => ({ resource: "edition" as const, id: e.id, title: e.title, deletedAt: e.deletedAt! })),
    ...sponsors.map((s) => ({ resource: "sponsor" as const, id: s.id, title: s.name, deletedAt: s.deletedAt! })),
  ];

  return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

export async function getTrashedCount(): Promise<number> {
  const counts = await Promise.all([
    prisma.chronicle.count({ where: { deletedAt: { not: null } } }),
    prisma.character.count({ where: { deletedAt: { not: null } } }),
    prisma.page.count({ where: { deletedAt: { not: null } } }),
    prisma.project.count({ where: { deletedAt: { not: null } } }),
    prisma.galleryAlbum.count({ where: { deletedAt: { not: null } } }),
    prisma.timelineMilestone.count({ where: { deletedAt: { not: null } } }),
    prisma.edition.count({ where: { deletedAt: { not: null } } }),
    prisma.sponsor.count({ where: { deletedAt: { not: null } } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

export async function restoreTrashedItem(resource: TrashResource, id: number): Promise<void> {
  const data = { deletedAt: null };
  switch (resource) {
    case "chronicle":
      await prisma.chronicle.update({ where: { id }, data });
      return;
    case "character":
      await prisma.character.update({ where: { id }, data });
      return;
    case "page":
      await prisma.page.update({ where: { id }, data });
      return;
    case "project":
      await prisma.project.update({ where: { id }, data });
      return;
    case "galleryAlbum":
      await prisma.galleryAlbum.update({ where: { id }, data });
      return;
    case "timelineMilestone":
      await prisma.timelineMilestone.update({ where: { id }, data });
      return;
    case "edition":
      await prisma.edition.update({ where: { id }, data });
      await reindexFromDatabase([id]); // its edition_pages rows were kept while trashed
      return;
    case "sponsor":
      await prisma.sponsor.update({ where: { id }, data });
      return;
  }
}

/** Permanently deletes one trashed item, including any files it owns on disk. */
export async function purgeTrashedItem(resource: TrashResource, id: number): Promise<void> {
  if (resource === "edition") {
    const edition = await prisma.edition.findUnique({ where: { id }, select: { pdfPath: true, thumbnailPath: true } });
    if (edition) {
      await deletePdfFile(edition.pdfPath);
      await deleteEditionThumbnail(edition.thumbnailPath);
      await unindexEditions([id]); // edition_pages rows go with the cascade delete below
    }
  }

  switch (resource) {
    case "chronicle":
      await prisma.chronicle.delete({ where: { id } }).catch(() => {});
      return;
    case "character":
      await prisma.character.delete({ where: { id } }).catch(() => {});
      return;
    case "page":
      await prisma.page.delete({ where: { id } }).catch(() => {});
      return;
    case "project":
      await prisma.project.delete({ where: { id } }).catch(() => {});
      return;
    case "galleryAlbum":
      await prisma.galleryAlbum.delete({ where: { id } }).catch(() => {});
      return;
    case "timelineMilestone":
      await prisma.timelineMilestone.delete({ where: { id } }).catch(() => {});
      return;
    case "edition":
      await prisma.edition.delete({ where: { id } }).catch(() => {});
      return;
    case "sponsor":
      await prisma.sponsor.delete({ where: { id } }).catch(() => {});
      return;
  }
}

/** Purges every trashed item older than the retention window. Called opportunistically when the trash page loads. */
export async function purgeExpiredTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expiredEditions = await prisma.edition.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, pdfPath: true, thumbnailPath: true },
  });
  await Promise.all(expiredEditions.map((e) => deletePdfFile(e.pdfPath)));
  await Promise.all(expiredEditions.map((e) => deleteEditionThumbnail(e.thumbnailPath)));
  await unindexEditions(expiredEditions.map((e) => e.id));

  await Promise.all([
    prisma.chronicle.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.character.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.page.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.project.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.galleryAlbum.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.timelineMilestone.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.edition.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.sponsor.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
  ]);
}
