import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { UPLOADS_ROOT } from "@/lib/uploads-root";
import { renderPdfFirstPageToJpeg } from "@/lib/pdf-render";

const THUMBNAILS_DIR = "thumbnails";
const THUMBNAIL_WIDTH = 400;

/**
 * Renders and saves the edition's cover thumbnail. Never throws — a failure
 * here (a malformed PDF, an unsupported encoding, etc.) must not break the
 * upload itself; the UI already falls back to a generic icon when
 * `thumbnailPath` is null.
 */
export async function generateEditionThumbnail(
  editionId: number,
  pdfBytes: Buffer
): Promise<string | null> {
  try {
    const jpeg = await renderPdfFirstPageToJpeg(pdfBytes, THUMBNAIL_WIDTH);
    await mkdir(path.join(UPLOADS_ROOT, THUMBNAILS_DIR), { recursive: true });
    const relPath = `${THUMBNAILS_DIR}/edicao-${editionId}.jpg`;
    await writeFile(path.join(UPLOADS_ROOT, relPath), jpeg);
    return relPath;
  } catch (err) {
    console.error(`Falha ao gerar thumbnail da edição ${editionId}:`, err);
    return null;
  }
}

export async function deleteEditionThumbnail(thumbnailPath: string | null | undefined) {
  if (!thumbnailPath) return;
  await rm(path.join(UPLOADS_ROOT, thumbnailPath), { force: true }).catch(() => {});
}
