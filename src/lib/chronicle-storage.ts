import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

export const CHRONICLE_UPLOAD_DIR = path.join(UPLOADS_ROOT, "chronicles");
export const CHRONICLE_PUBLIC_PREFIX = "/api/uploads/chronicles";

export async function ensureChronicleUploadDir() {
  await mkdir(CHRONICLE_UPLOAD_DIR, { recursive: true });
}

export async function deleteChronicleFile(url: string) {
  if (!url.startsWith(CHRONICLE_PUBLIC_PREFIX)) return;
  const fileName = path.basename(url);
  await rm(path.join(CHRONICLE_UPLOAD_DIR, fileName), { force: true });
}
