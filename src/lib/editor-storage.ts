import path from "node:path";
import { mkdir } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

/** Shared image storage for content inserted through the rich text editor toolbar. */
export const EDITOR_UPLOAD_DIR = path.join(UPLOADS_ROOT, "editor");
export const EDITOR_PUBLIC_PREFIX = "/api/uploads/editor";

export async function ensureEditorUploadDir() {
  await mkdir(EDITOR_UPLOAD_DIR, { recursive: true });
}
