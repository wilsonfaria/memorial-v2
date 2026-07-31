import { createRequire } from "node:module";
import path from "node:path";

/**
 * Minimal shape of what we use from `@napi-rs/canvas` — kept local instead of
 * `import type { ... } from "@napi-rs/canvas"` because that package is
 * intentionally NOT a dependency of this project (see comment below); we
 * only ever touch it indirectly through pdfjs-dist's own nested copy, so
 * there's no guaranteed `@napi-rs/canvas` install to resolve types against.
 */
type NapiCanvasModule = {
  createCanvas(width: number, height: number): NapiCanvas;
};
type NapiCanvas = {
  width: number;
  height: number;
  getContext(kind: "2d"): NapiCanvasContext;
  encode(format: "jpeg", quality: number): Promise<Buffer>;
};
type NapiCanvasContext = Record<string, unknown>;

/**
 * pdfjs-dist's Node build itself does `require("@napi-rs/canvas")` internally
 * (for its Path2D/DOMMatrix/ImageData polyfills) as an *optional* dependency
 * of pdfjs-dist — it's never something our own package.json needs to list.
 *
 * Resolving it ourselves via a plain `import "@napi-rs/canvas"` at the
 * top level is actively harmful: if versions ever drift, npm installs a
 * *second* copy of the native addon, and objects created by "our" copy
 * (e.g. `new Path2D()`) aren't recognized by pdfjs's copy's `ctx.fill()` —
 * it throws `Value is none of these types 'String', 'Path'` despite the
 * argument genuinely being a Path2D instance, just from the wrong loaded
 * addon. Requiring it relative to pdfjs-dist's own install location
 * guarantees we always get the exact same loaded instance pdfjs uses.
 *
 * Note: this deliberately does NOT use `require.resolve("pdfjs-dist/...")`
 * to find that location. Next.js's bundler rewrites `require`/`require.resolve`
 * calls for anything listed in `serverExternalPackages` (pdfjs-dist is)
 * into an internal placeholder string ("[externals]pdfjs-dist/package.json
 * [external] (...)") instead of a real filesystem path — harmless for a
 * plain `require()` of the package itself, but breaks any code trying to
 * introspect *where* it lives. `process.cwd()` is the app root at runtime
 * in both dev and the Hostinger standalone build, so we can point straight
 * at its node_modules without asking the bundler to resolve anything.
 */
function loadCanvasModuleUsedByPdfjs(): NapiCanvasModule {
  const pdfjsDir = path.join(process.cwd(), "node_modules", "pdfjs-dist");
  const requireFromPdfjs = createRequire(path.join(pdfjsDir, "noop.cjs"));
  return requireFromPdfjs("@napi-rs/canvas");
}

type NodeCanvasAndContext = { canvas: NapiCanvas; context: NapiCanvasContext };

class NodeCanvasFactory {
  constructor(private napiCanvas: NapiCanvasModule) {}

  create(width: number, height: number): NodeCanvasAndContext {
    const canvas = this.napiCanvas.createCanvas(width, height);
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
  const standardFontDataUrl =
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").split(path.sep).join("/") + "/";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    standardFontDataUrl,
  });

  const pdfDoc = await loadingTask.promise;
  const napiCanvas = loadCanvasModuleUsedByPdfjs();
  const canvasFactory = new NodeCanvasFactory(napiCanvas);
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
