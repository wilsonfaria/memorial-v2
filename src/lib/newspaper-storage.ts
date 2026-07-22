import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const NEWSPAPER_UPLOAD_DIR = path.join(UPLOADS_ROOT, "newspaper");
export const NEWSPAPER_PUBLIC_PREFIX = "/api/uploads/newspaper";

export async function ensureNewspaperUploadDir() {
  await mkdir(NEWSPAPER_UPLOAD_DIR, { recursive: true });
}

export async function deleteNewspaperLogo(logoUrl: string) {
  if (!logoUrl.startsWith(NEWSPAPER_PUBLIC_PREFIX)) return;
  const fileName = path.basename(logoUrl);
  await rm(path.join(NEWSPAPER_UPLOAD_DIR, fileName), { force: true });
}
