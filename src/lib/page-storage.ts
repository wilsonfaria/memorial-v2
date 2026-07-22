import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const PAGE_UPLOAD_DIR = path.join(UPLOADS_ROOT, "pages");
export const PAGE_PUBLIC_PREFIX = "/api/uploads/pages";

export async function ensurePageUploadDir() {
  await mkdir(PAGE_UPLOAD_DIR, { recursive: true });
}

export async function deletePageImageFile(url: string) {
  if (!url.startsWith(PAGE_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(PAGE_UPLOAD_DIR, fileName), { force: true });
}
