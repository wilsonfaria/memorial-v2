import { readFile } from "node:fs/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";
import { renderPdfPageToJpeg } from "@/lib/pdf-render";

/**
 * GET /api/admin/page-image?edition=ID&page=N — a PDF page rendered as JPEG,
 * for correcting a transcription with the original in view. Admin-only:
 * rendering costs CPU, so it isn't exposed to the public.
 */
export async function GET(request: Request) {
  if (!(await getSession())) return new Response("Não autorizado", { status: 401 });

  const url = new URL(request.url);
  const editionId = Number(url.searchParams.get("edition"));
  const page = Number(url.searchParams.get("page"));
  if (!Number.isInteger(editionId) || !Number.isInteger(page) || page < 1) {
    return new Response("Parâmetros inválidos", { status: 400 });
  }
  const edition = await prisma.edition.findUnique({ where: { id: editionId }, select: { pdfPath: true, pageCount: true } });
  if (!edition?.pdfPath) return new Response("Edição não encontrada", { status: 404 });
  if (edition.pageCount && page > edition.pageCount) return new Response("Página inexistente", { status: 404 });

  try {
    const jpeg = await renderPdfPageToJpeg(await readFile(absolutePdfPath(edition.pdfPath)), page, 1400);
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch (err) {
    return new Response(`Falha ao renderizar: ${(err as Error).message}`, { status: 500 });
  }
}
