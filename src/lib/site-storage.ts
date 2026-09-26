import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const SITE_UPLOAD_DIR = path.join(UPLOADS_ROOT, "site");
export const SITE_PUBLIC_PREFIX = "/api/uploads/site";

export async function ensureSiteUploadDir() {
  await mkdir(SITE_UPLOAD_DIR, { recursive: true });
}

export async function deleteSiteFile(url: string) {
  if (!url.startsWith(SITE_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(SITE_UPLOAD_DIR, fileName), { force: true });
}
