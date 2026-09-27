"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureStorageDir, STORAGE_ROOT } from "@/lib/storage";
import { MAX_PDF_BYTES, formatMaxSize } from "@/lib/upload-limits";
import { generateEditionThumbnail } from "@/lib/thumbnail";
import {
  indexEdition,
  indexEditionSafely,
  reindexBatch,
  unindexEditions,
  type ReindexBatchResult,
  type ReindexMode,
} from "@/lib/search/indexer";
import { getMeiliStatus, isMeiliConfigured, type MeiliStatus } from "@/lib/search/meili";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string } | undefined;

export async function createEditionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const monthId = Number(formData.get("monthId"));
  const title = String(formData.get("title") ?? "").trim();
  const editionNumberRaw = String(formData.get("editionNumber") ?? "").trim();
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  const file = formData.get("file");

  if (!monthId) return { error: "Selecione o mês da edição." };
  if (title.length < 2) return { error: "Informe um título para a edição." };
  if (!publishedAtRaw) return { error: "Informe a data de publicação." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione o arquivo PDF da edição." };
  }
  if (file.type !== "application/pdf") {
    return { error: "O arquivo deve ser um PDF." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: `O arquivo deve ter no máximo ${formatMaxSize(MAX_PDF_BYTES)}.` };
  }

  const month = await prisma.month.findUnique({
    where: { id: monthId },
    include: { year: true },
  });
  if (!month) return { error: "Mês não encontrado." };

  const editionNumber = editionNumberRaw ? Number(editionNumberRaw) : null;
  const publishedAt = new Date(publishedAtRaw);

  const edition = await prisma.edition.create({
    data: {
      title,
      editionNumber,
      publishedAt,
      pdfPath: "",
      monthId,
    },
  });

  try {
    const relDir = path.join(String(month.year.year), String(month.month).padStart(2, "0"));
    await ensureStorageDir(relDir);
    const fileName = `edicao-${edition.id}.pdf`;
    const relPath = path.join(relDir, fileName).replace(/\\/g, "/");

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(STORAGE_ROOT, relPath), bytes);

    const thumbnailPath = await generateEditionThumbnail(edition.id, bytes);

    await prisma.edition.update({
      where: { id: edition.id },
      data: { pdfPath: relPath, fileSizeBytes: bytes.byteLength, thumbnailPath },
    });

    // Page text for search (embedded text layer only; never throws).
    await indexEditionSafely(edition.id, bytes);
  } catch (err) {
    // Never leave a DB row with no file behind.
    await prisma.edition.delete({ where: { id: edition.id } }).catch(() => {});
    console.error("Falha ao salvar o PDF da edição:", err);
    return { error: "Falha ao salvar o arquivo no servidor. Tente enviar o PDF novamente." };
  }

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
  revalidatePath(`/mes/${monthId}`);
}

/** Moves the edition to the trash (see src/lib/trash.ts) instead of deleting its row and PDF outright. */
export async function deleteEditionAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.edition.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});
  await unindexEditions([id]);

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
}

export type OcrActionState = { error?: string; success?: string } | undefined;

/**
 * Re-extracts one edition's page text — this time with OCR for pages that
 * have no embedded text layer — and re-indexes it for search. Uploads only
 * read the embedded text (cheap); OCR is CPU-heavy, so it stays opt-in here.
 */
export async function extractEditionTextAction(
  _prevState: OcrActionState,
  formData: FormData
): Promise<OcrActionState> {
  await requireSession();
  const id = Number(formData.get("id"));

  const edition = await prisma.edition.findUnique({ where: { id } });
  if (!edition) return { error: "Edição não encontrada." };

  try {
    const result = await indexEdition(id, { ocr: true });

    revalidatePath("/admin/edicoes");
    revalidatePath("/edicoes");

    if (result.pagesWithText === 0) {
      return { error: "Nenhum texto foi reconhecido nesta edição." };
    }
    const parts = [`Texto de ${result.pagesWithText} de ${result.pagesTotal} página(s) indexado`];
    if (result.ocrPages > 0) parts.push(`${result.ocrPages} via OCR`);
    if (result.pagesWithoutText > 0) parts.push(`${result.pagesWithoutText} sem texto reconhecível`);
    if (result.meili === "error") parts.push("atenção: o Meilisearch não aceitou — use “Indexar busca”");
    return { success: `${parts.join(", ")}.` };
  } catch (err) {
    console.error("Falha ao extrair texto da edição:", err);
    return { error: "Falha ao ler ou processar o PDF desta edição." };
  }
}

/** Moves the selected editions to the trash (see src/lib/trash.ts) instead of deleting them outright. */
export async function bulkDeleteEditionsAction(ids: number[]) {
  await requireSession();
  if (ids.length === 0) return { error: "Nenhuma edição selecionada." };

  const result = await prisma.edition.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  await unindexEditions(ids);

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
  return { success: `${result.count} edição(ões) movida(s) para a lixeira.` };
}

export type SearchIndexStatus = {
  editions: number;
  editionsWithText: number;
  pages: number;
  /** null = MEILI_URL / MEILI_KEY not set */
  meili: MeiliStatus | null;
};

export async function getSearchIndexStatusAction(): Promise<SearchIndexStatus> {
  await requireSession();
  const [editions, editionsWithText, pages, meili] = await Promise.all([
    prisma.edition.count({ where: { deletedAt: null } }),
    prisma.edition.count({ where: { deletedAt: null, pages: { some: {} } } }),
    prisma.editionPage.count({ where: { edition: { deletedAt: null } } }),
    isMeiliConfigured() ? getMeiliStatus() : Promise.resolve(null),
  ]);
  return { editions, editionsWithText, pages, meili };
}

/**
 * One step of the admin "Indexar busca" loop (see SearchIndexPanel): the
 * client calls this repeatedly with the returned cursor, so each request
 * stays short no matter how many PDFs there are.
 */
export async function reindexSearchBatchAction(
  mode: ReindexMode,
  cursor: number
): Promise<ReindexBatchResult | { error: string }> {
  await requireSession();
  if (!["missing", "all", "sync"].includes(mode)) return { error: "Modo inválido." };
  if (mode === "sync" && !isMeiliConfigured()) return { error: "Meilisearch não configurado (MEILI_URL / MEILI_KEY)." };
  try {
    const result = await reindexBatch(mode, cursor, mode === "sync" ? 100 : 8);
    if (result.nextCursor == null) revalidatePath("/admin/edicoes");
    return result;
  } catch (err) {
    console.error("Falha ao indexar a busca:", err);
    return { error: (err as Error).message };
  }
}
