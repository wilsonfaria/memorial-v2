import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

export const PAGE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pages");
export const PAGE_PUBLIC_PREFIX = "/uploads/pages";

export async function ensurePageUploadDir() {
  await mkdir(PAGE_UPLOAD_DIR, { recursive: true });
}

export async function deletePageImageFile(url: string) {
  if (!url.startsWith(PAGE_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(PAGE_UPLOAD_DIR, fileName), { force: true });
}
