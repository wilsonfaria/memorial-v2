import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { prisma } from "@/lib/prisma";
import { absolutePdfPath } from "@/lib/storage";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/editions/[id]/file">
) {
  const { id } = await ctx.params;
  const edition = await prisma.edition.findUnique({ where: { id: Number(id) } });

  if (!edition) {
    return new Response("Edição não encontrada", { status: 404 });
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
