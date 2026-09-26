/**
 * Client-safe constants/types for the trash feature — no Prisma, no
 * filesystem. Kept separate from trash.ts (server-only: touches Prisma and,
 * via thumbnail.ts -> pdf-render.ts, the Node-only @napi-rs/canvas native
 * binding) so importing these into a "use client" component doesn't drag
 * that whole chain into the browser bundle.
 */

export const TRASH_RESOURCES = [
  "chronicle",
  "character",
  "page",
  "project",
  "galleryAlbum",
  "timelineMilestone",
  "edition",
  "sponsor",
] as const;

export type TrashResource = (typeof TRASH_RESOURCES)[number];

export const TRASH_LABELS: Record<TrashResource, string> = {
  chronicle: "Crônica",
  character: "Personagem",
  page: "Página",
  project: "Projeto",
  galleryAlbum: "Álbum de fotos",
  timelineMilestone: "Marco da linha do tempo",
  edition: "Edição",
  sponsor: "Patrocinador",
};

/** Where a restored item can be reviewed in the admin. */
export const TRASH_ADMIN_PATH: Record<TrashResource, string> = {
  chronicle: "/admin/cronicas",
  character: "/admin/personagens",
  page: "/admin/paginas",
  project: "/admin/projetos",
  galleryAlbum: "/admin/galeria",
  timelineMilestone: "/admin/linha-do-tempo",
  edition: "/admin/edicoes",
  sponsor: "/admin/patrocinadores",
};

export type TrashedItem = {
  resource: TrashResource;
  id: number;
  title: string;
  deletedAt: Date;
};

/** Days a trashed item is kept before it's purged for good. */
export const TRASH_RETENTION_DAYS = 30;
