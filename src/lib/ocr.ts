import path from "node:path";
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";

/** Same NodeCanvasFactory shape used by pdf-render.ts, needed here to rasterize
 * scanned pages (no embedded text layer) before handing them to OCR. */
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

// Old scanned issues have no text layer at all; recent ones may already be
// digitally typeset. Below this many characters on a page's embedded text
// layer, we treat it as "no real text" and fall back to image OCR.
const TEXT_LAYER_MIN_CHARS = 25;

// Shared hosting has finite CPU/RAM per request; cap how many pages we OCR
// per edition so one huge scanned issue can't tie up the process for
// minutes. Operators can re-run extraction later if an issue is truncated.
const MAX_OCR_PAGES = 40;

export type ExtractionResult = {
  text: string;
  pagesProcessed: number;
  pagesTotal: number;
  ocrPages: number;
  truncated: boolean;
};

export async function extractEditionText(pdfBytes: Buffer): Promise<ExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl =
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").split(path.sep).join("/") + "/";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    standardFontDataUrl,
  });
  const pdfDoc = await loadingTask.promise;

  const pagesTotal = pdfDoc.numPages;
  const pagesToProcess = Math.min(pagesTotal, MAX_OCR_PAGES);
  const canvasFactory = new NodeCanvasFactory();
  const pageTexts: string[] = [];
  let ocrPages = 0;

  try {
    let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;

    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);

      const textContent = await page.getTextContent();
      const layerText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (layerText.length >= TEXT_LAYER_MIN_CHARS) {
        pageTexts.push(layerText);
        continue;
      }

      // No usable text layer — rasterize the page and OCR it.
      worker ??= await createOcrWorker();
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = 1600 / baseViewport.width;
      const viewport = page.getViewport({ scale: Math.min(Math.max(scale, 1), 3) });
      const canvasAndContext = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

      try {
        await page.render({
          // @ts-expect-error @napi-rs/canvas's context is API-compatible with the DOM one pdfjs expects at runtime
          canvasContext: canvasAndContext.context,
          viewport,
          canvasFactory,
        }).promise;

        const pngBuffer = await canvasAndContext.canvas.encode("png");
        const { data } = await worker.recognize(pngBuffer);
        pageTexts.push(data.text.replace(/\s+/g, " ").trim());
        ocrPages++;
      } finally {
        canvasFactory.destroy(canvasAndContext);
      }
    }

    if (worker) await worker.terminate();
  } finally {
    await pdfDoc.destroy();
  }

  return {
    text: pageTexts.filter(Boolean).join("\n\n"),
    pagesProcessed: pagesToProcess,
    pagesTotal,
    ocrPages,
    truncated: pagesTotal > pagesToProcess,
  };
}

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("por");
}
