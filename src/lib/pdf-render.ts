import path from "node:path";
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";

/**
 * `@napi-rs/canvas` is declared as our own dependency, pinned to the same
 * range pdfjs-dist itself uses as an *optional* dependency (`^0.1.80`, see
 * pdfjs-dist/package.json). This matters in both directions:
 *
 * - pdfjs-dist's Node build does `require("@napi-rs/canvas")` internally
 *   (for its Path2D/DOMMatrix/ImageData polyfills) but only as *optional* —
 *   on Hostinger that optional install was silently skipped (visible only
 *   as a "Cannot load @napi-rs/canvas package" warning in the app log),
 *   which left `globalThis.DOMMatrix` unset and crashed every render with
 *   `ReferenceError: DOMMatrix is not defined`. Declaring it as a *required*
 *   dependency of this project forces a real install (or a loud `npm
 *   install` failure instead of a silent runtime one).
 * - It must stay within pdfjs-dist's own accepted range so npm dedupes both
 *   requirers to a single physical copy. Two separate copies (e.g. from
 *   pinning an unrelated major version here) means objects created by
 *   "our" copy — like `new Path2D()` — aren't recognized by the other
 *   copy's native bindings: `ctx.fill(path)` throws `Value is none of
 *   these types 'String', 'Path'` despite a genuine Path2D being passed.
 */
type NodeCanvasAndContext = { canvas: Canvas; context: SKRSContext2D };

class NodeCanvasFactory {
  create(width: number, height: number): NodeCanvasAndContext {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext: NodeCanvasAndContext, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: Partial<NodeCanvasAndContext>) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = undefined;
    canvasAndContext.context = undefined;
  }
}

/**
 * Rasterizes the first page of a PDF to a JPEG buffer, for edition list
 * thumbnails. Runs once at upload time (not per-request) so listing pages
 * never need to fetch/parse a full PDF client-side just to show a preview.
 */
export async function renderPdfFirstPageToJpeg(
  pdfBytes: Buffer,
  targetWidth = 400
): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs's Node-side font loader wants a plain filesystem path (not a
  // file:// URL — Node's native fetch() can't retrieve those) ending in a
  // forward slash specifically, regardless of OS path separator conventions.
  const standardFontDataUrl =
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").split(path.sep).join("/") + "/";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    standardFontDataUrl,
  });

  const pdfDoc = await loadingTask.promise;
  const canvasFactory = new NodeCanvasFactory();
  let canvasAndContext: NodeCanvasAndContext | null = null;

  try {
    const page = await pdfDoc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    canvasAndContext = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

    await page.render({
      // @ts-expect-error the render options type expects a DOM CanvasRenderingContext2D; this is @napi-rs/canvas's context, which pdfjs's Node build accepts at runtime
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    }).promise;

    return await canvasAndContext.canvas.encode("jpeg", 82);
  } finally {
    if (canvasAndContext) canvasFactory.destroy(canvasAndContext);
    await pdfDoc.destroy();
  }
}
