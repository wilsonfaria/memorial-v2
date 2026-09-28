import { createReadStream } from "node:fs";

/**
 * Streams a file (or a byte range of it) as a web ReadableStream that
 * tolerates the client going away. `Readable.toWeb()` throws an uncaught
 * "Controller is already closed" when the browser aborts mid-download —
 * which pdf.js does routinely once it switches to range requests — so we
 * bridge the Node stream by hand and destroy it on cancel.
 */
export function fileStream(absPath: string, start?: number, end?: number): ReadableStream<Uint8Array> {
  const file = createReadStream(absPath, { start, end });
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      file.on("data", (chunk) => {
        if (closed) return;
        const buf = chunk as Buffer;
        try {
          controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
        } catch {
          closed = true;
          file.destroy();
          return;
        }
        if ((controller.desiredSize ?? 1) <= 0) file.pause();
      });
      file.on("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      });
      file.on("error", (err) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(err);
        } catch {}
      });
    },
    pull() {
      file.resume();
    },
    cancel() {
      closed = true;
      file.destroy();
    },
  });
}

export type ByteRange = { start: number; end: number };

/**
 * Parses a single-range "Range: bytes=a-b" header. Returns null when there is
 * no (usable) Range header — serve the whole file — and "invalid" when the
 * range can't be satisfied (416).
 */
export function parseRange(header: string | null, size: number): ByteRange | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null; // multi-range or malformed: ignore
  let start: number;
  let end: number;
  if (m[1] === "") {
    // suffix range: last N bytes
    const n = Number(m[2]);
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}
