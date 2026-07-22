import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

/**
 * On Hostinger, `process.cwd()` is the git-deployed app folder, which the
 * hPanel "Reimplantar" build rebuilds from scratch each time (it builds into
 * a separate `.builds/<hash>` dir and swaps it in) — anything living only
 * under that folder, even if gitignored, does not survive a redeploy since
 * the new build never copies from the old one. `PDF_STORAGE_ROOT` must point
 * outside that tree (e.g. a sibling folder to `nodejs/` such as
 * `/home/<user>/domains/<domain>/edicoes`) to persist across deploys.
 */
export const STORAGE_ROOT =
  process.env.PDF_STORAGE_ROOT ?? path.join(process.cwd(), "storage", "pdfs");

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
