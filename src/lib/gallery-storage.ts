import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const GALLERY_UPLOAD_DIR = path.join(UPLOADS_ROOT, "gallery");
export const GALLERY_PUBLIC_PREFIX = "/api/uploads/gallery";

export async function ensureGalleryUploadDir() {
  await mkdir(GALLERY_UPLOAD_DIR, { recursive: true });
}

export async function deleteGalleryFile(url: string) {
  if (!url.startsWith(GALLERY_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(GALLERY_UPLOAD_DIR, fileName), { force: true });
}
