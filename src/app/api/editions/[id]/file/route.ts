import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";
import { recordAnalyticsEvent } from "@/lib/analytics";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/editions/[id]/file">
) {
  const { id } = await ctx.params;
  const edition = await prisma.edition.findUnique({ where: { id: Number(id) } });

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

  const isDownload = new URL(request.url).searchParams.get("download") != null;
  if (isDownload) {
    await recordAnalyticsEvent("EDITION_DOWNLOAD", edition.id);
  }
  const fileName = `${edition.title.replace(/[^\w\-À-ÿ ]/g, "")}.pdf`;

  const webStream = Readable.toWeb(
    createReadStream(absPath)
  ) as NodeWebReadableStream<Uint8Array>;

  return new Response(webStream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
        fileName
      )}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
