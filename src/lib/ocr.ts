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

// Cap how many pages we OCR per edition so one huge scanned issue can't tie
// up the process for minutes. Pages past the cap are reported as without text.
const MAX_OCR_PAGES = 40;

export type ExtractedPage = { page: number; text: string; ocr: boolean };

export type ExtractionResult = {
  /** One entry per page that yielded text, 1-based page numbers. */
  pages: ExtractedPage[];
  pagesTotal: number;
  ocrPages: number;
  /** Pages that had no text layer and were skipped (OCR off or past MAX_OCR_PAGES). */
  pagesWithoutText: number;
};

/**
 * Reads the text of every page. The embedded text layer is used when present
 * (cheap — this archive's scans already carry one). Pages without it are
 * OCR'd only when `ocr` is true: that's CPU-heavy, so uploads skip it and the
 * admin "Extrair texto" button opts in per edition.
 */
export async function extractEditionPages(
  pdfBytes: Buffer,
  { ocr = false }: { ocr?: boolean } = {}
): Promise<ExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl =
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").split(path.sep).join("/") + "/";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    standardFontDataUrl,
  });
  const pdfDoc = await loadingTask.promise;

  const pagesTotal = pdfDoc.numPages;
  const canvasFactory = new NodeCanvasFactory();
  const pages: ExtractedPage[] = [];
  let ocrPages = 0;
  let pagesWithoutText = 0;

  try {
    let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;

    for (let pageNum = 1; pageNum <= pagesTotal; pageNum++) {
      // pdf.js parses on the main thread in Node; yield between pages so a
      // bulk reindex running inside the web server doesn't starve requests.
      await new Promise((resolve) => setImmediate(resolve));
      const page = await pdfDoc.getPage(pageNum);

      const textContent = await page.getTextContent();
      const layerText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (layerText.length >= TEXT_LAYER_MIN_CHARS) {
        pages.push({ page: pageNum, text: layerText, ocr: false });
        continue;
      }

      if (!ocr || ocrPages >= MAX_OCR_PAGES) {
        pagesWithoutText++;
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
        const ocrText = data.text.replace(/\s+/g, " ").trim();
        if (ocrText) pages.push({ page: pageNum, text: ocrText, ocr: true });
        else pagesWithoutText++;
        ocrPages++;
      } finally {
        canvasFactory.destroy(canvasAndContext);
      }
    }

    if (worker) await worker.terminate();
  } finally {
    await pdfDoc.destroy();
  }

  return { pages, pagesTotal, ocrPages, pagesWithoutText };
}

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("por");
}
