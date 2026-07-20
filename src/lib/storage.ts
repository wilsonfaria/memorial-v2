import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "pdfs");

export function absolutePdfPath(relPath: string) {
  const abs = path.join(STORAGE_ROOT, relPath);
  if (!abs.startsWith(STORAGE_ROOT)) {
    throw new Error("Caminho de arquivo inválido");
  }
  return abs;
}

export async function ensureStorageDir(relDir: string) {
  const abs = path.join(STORAGE_ROOT, relDir);
  await mkdir(abs, { recursive: true });
  return abs;
}

export async function deletePdfFile(relPath: string) {
  await rm(absolutePdfPath(relPath), { force: true });
}
