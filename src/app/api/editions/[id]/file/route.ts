import { stat } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";
import { recordAnalyticsEvent } from "@/lib/analytics";
import { fileStream, parseRange } from "@/lib/file-response";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/editions/[id]/file">
) {
  const { id } = await ctx.params;
  const edition = await prisma.edition.findFirst({ where: { id: Number(id), deletedAt: null } });

  if (!edition) {
    return new Response("Edição não encontrada", { status: 404 });
  }
  if (!edition.pdfPath) {
    // pdfPath empty means a previous upload never finished writing the file
    // (e.g. it errored out after the edition row was created). Without this
    // guard, absolutePdfPath("") resolves to the storage root *directory*,
    // and streaming a directory as if it were a file breaks the response
    // instead of cleanly 404ing.
    return new Response("Arquivo não encontrado no armazenamento", { status: 404 });
  }

  let absPath: string;
  try {
    absPath = absolutePdfPath(edition.pdfPath);
  } catch {
    return new Response("Caminho inválido", { status: 400 });
  }

  let size: number;
  try {
    size = (await stat(absPath)).size;
  } catch {
    return new Response("Arquivo não encontrado no armazenamento", { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const isDownload = new URL(request.url).searchParams.get("download") != null;
  // Count a download once, not once per byte range the browser asks for.
  if (isDownload && (!range || range.start === 0)) {
    await recordAnalyticsEvent("EDITION_DOWNLOAD", edition.id);
  }
  const fileName = `${edition.title.replace(/[^\w\-À-ÿ ]/g, "")}.pdf`;

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`,
    "Cache-Control": "private, max-age=3600",
  };

  // Range support lets pdf.js fetch only the parts it needs to show the
  // first page, instead of waiting for the whole (often 5+ MB) file.
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
    return new Response(fileStream(absPath, range.start, range.end), { status: 206, headers });
  }
  headers["Content-Length"] = String(size);
  return new Response(fileStream(absPath), { headers });
}
