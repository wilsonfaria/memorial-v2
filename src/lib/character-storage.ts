import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const CHARACTER_UPLOAD_DIR = path.join(UPLOADS_ROOT, "characters");
export const CHARACTER_PUBLIC_PREFIX = "/api/uploads/characters";

export async function ensureCharacterUploadDir() {
  await mkdir(CHARACTER_UPLOAD_DIR, { recursive: true });
}

export async function deleteCharacterFile(url: string) {
  if (!url.startsWith(CHARACTER_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(CHARACTER_UPLOAD_DIR, fileName), { force: true });
}
