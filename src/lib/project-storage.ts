import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const PROJECT_UPLOAD_DIR = path.join(UPLOADS_ROOT, "projects");
export const PROJECT_PUBLIC_PREFIX = "/api/uploads/projects";

export async function ensureProjectUploadDir() {
  await mkdir(PROJECT_UPLOAD_DIR, { recursive: true });
}

export async function deleteProjectFile(url: string) {
  if (!url.startsWith(PROJECT_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(PROJECT_UPLOAD_DIR, fileName), { force: true });
}
