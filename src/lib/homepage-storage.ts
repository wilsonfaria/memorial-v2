import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const HOMEPAGE_UPLOAD_DIR = path.join(UPLOADS_ROOT, "homepage");
export const HOMEPAGE_PUBLIC_PREFIX = "/api/uploads/homepage";

export async function ensureHomepageUploadDir() {
  await mkdir(HOMEPAGE_UPLOAD_DIR, { recursive: true });
}

export async function deleteHomepageFile(url: string) {
  if (!url.startsWith(HOMEPAGE_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(HOMEPAGE_UPLOAD_DIR, fileName), { force: true });
}
