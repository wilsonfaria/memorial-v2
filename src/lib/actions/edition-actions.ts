"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureStorageDir, absolutePdfPath, STORAGE_ROOT } from "@/lib/storage";
import { MAX_PDF_BYTES, formatMaxSize } from "@/lib/upload-limits";
import { generateEditionThumbnail } from "@/lib/thumbnail";
import { extractEditionText } from "@/lib/ocr";

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

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
}

export type OcrActionState = { error?: string; success?: string } | undefined;

/**
 * Runs text extraction (embedded PDF text layer, falling back to OCR for
 * scanned pages) for one edition and stores the result for full-text search.
 * Deliberately single-edition and admin-triggered rather than automatic on
 * upload: OCR is CPU-heavy and shared hosting has tight process limits, so
 * bulk-processing hundreds of issues at once would risk taking the site down.
 */
export async function extractEditionTextAction(
  _prevState: OcrActionState,
  formData: FormData
): Promise<OcrActionState> {
  await requireSession();
  const id = Number(formData.get("id"));

  const edition = await prisma.edition.findUnique({ where: { id } });
  if (!edition) return { error: "Edição não encontrada." };

  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePdfPath(edition.pdfPath));
  } catch {
    return { error: "Não foi possível ler o arquivo PDF desta edição." };
  }

  try {
    const result = await extractEditionText(bytes);
    await prisma.edition.update({ where: { id }, data: { extractedText: result.text || null } });

    revalidatePath("/admin/edicoes");
    revalidatePath("/edicoes");

    if (!result.text) {
      return { error: "Nenhum texto foi reconhecido nesta edição." };
    }
    const parts = [`Texto extraído de ${result.pagesProcessed} de ${result.pagesTotal} página(s)`];
    if (result.ocrPages > 0) parts.push(`${result.ocrPages} via OCR`);
    if (result.truncated) parts.push("processamento limitado por tamanho — rode novamente se preciso");
    return { success: `${parts.join(", ")}.` };
  } catch (err) {
    console.error("Falha ao extrair texto da edição:", err);
    return { error: "Falha ao processar o PDF para extração de texto." };
  }
}

/** Moves the selected editions to the trash (see src/lib/trash.ts) instead of deleting them outright. */
export async function bulkDeleteEditionsAction(ids: number[]) {
  await requireSession();
  if (ids.length === 0) return { error: "Nenhuma edição selecionada." };

  const result = await prisma.edition.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
  return { success: `${result.count} edição(ões) movida(s) para a lixeira.` };
}
