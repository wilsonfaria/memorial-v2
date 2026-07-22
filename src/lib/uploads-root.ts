import path from "node:path";

/**
 * Same reasoning as STORAGE_ROOT in `storage.ts`: `process.cwd()` is the
 * git-deployed app folder, rebuilt from scratch on each Hostinger redeploy,
 * so anything living only under it (even gitignored) doesn't survive.
 * `UPLOADS_STORAGE_ROOT` should point outside that tree.
 */
export const UPLOADS_ROOT =
  process.env.UPLOADS_STORAGE_ROOT ?? path.join(process.cwd(), "public", "uploads");
