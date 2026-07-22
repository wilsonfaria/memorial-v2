import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { UPLOADS_ROOT } from "@/lib/uploads-root";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/uploads/[...path]">
) {
  const { path: segments } = await ctx.params;
  const abs = path.join(UPLOADS_ROOT, ...segments);

  // Must stay under UPLOADS_ROOT — blocks ../ escaping into arbitrary paths.
  if (!abs.startsWith(UPLOADS_ROOT)) {
    return new Response("Caminho inválido", { status: 400 });
  }

  let size: number;
  try {
    size = (await stat(abs)).size;
  } catch {
    return new Response("Arquivo não encontrado", { status: 404 });
  }

  const contentType = MIME_BY_EXT[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
  const webStream = Readable.toWeb(createReadStream(abs)) as NodeWebReadableStream<Uint8Array>;

  return new Response(webStream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
