import path from "node:path";

/**
 * Same reasoning as STORAGE_ROOT / UPLOADS_ROOT: `process.cwd()` is rebuilt
 * from scratch on each Hostinger redeploy, so files saved here (DB/SMTP
 * settings from the admin panel) wouldn't survive a redeploy either.
 * `APP_CONFIG_ROOT` should point outside that tree.
 */
export const CONFIG_ROOT =
  process.env.APP_CONFIG_ROOT ?? path.join(process.cwd(), "config");
