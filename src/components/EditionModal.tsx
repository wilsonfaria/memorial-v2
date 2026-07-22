"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download, X, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { formatDateLong, formatFileSize } from "@/lib/format";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

type EditionDetail = {
  id: number;
  title: string;
  publishedAt: string;
  fileSizeBytes: number | null;
  pageCount: number | null;
};

export default function EditionModal() {
  const { openEditionId, closeEdition } = useEditionModal();
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const BASE_WIDTH = 640;

  useEffect(() => {
    if (openEditionId == null) {
      // Resetting local viewer state when the modal closes, not syncing from an external system.
      /* eslint-disable react-hooks/set-state-in-effect */
      setEdition(null);
      setNumPages(null);
      setPageNumber(1);
      setZoom(1);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    fetch(`/api/editions/${openEditionId}`)
      .then((res) => res.json())
      .then((data) => setEdition(data));
  }, [openEditionId]);

  useEffect(() => {
    if (openEditionId == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdition();
      if (e.key === "ArrowRight") setPageNumber((p) => Math.min(p + 1, numPages ?? p));
      if (e.key === "ArrowLeft") setPageNumber((p) => Math.max(p - 1, 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, MAX_ZOOM));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, MIN_ZOOM));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openEditionId, closeEdition, numPages]);

  if (openEditionId == null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={closeEdition}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-paper-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-brand-900">
              {edition?.title ?? "Carregando edição..."}
            </h2>
            {edition && (
              <p className="truncate text-xs text-slate-500">
                {formatDateLong(new Date(edition.publishedAt))}
                {edition.fileSizeBytes ? ` · ${formatFileSize(edition.fileSizeBytes)}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end sm:gap-3">
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-paper-200 bg-white p-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, MIN_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                className="flex h-7 w-7 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50 disabled:opacity-30"
                title="Diminuir zoom"
              >
                <ZoomOut size={14} />
              </button>
              <span className="w-10 text-center text-xs text-slate-500">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                className="flex h-7 w-7 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50 disabled:opacity-30"
                title="Aumentar zoom"
              >
                <ZoomIn size={14} />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={() => setZoom(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50"
                  title="Restaurar zoom"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
            <a
              href={`/api/editions/${openEditionId}/file?download=1`}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent-500 px-3 text-sm font-medium text-white shadow-sm hover:bg-accent-600"
              title="Baixar PDF"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={closeEdition}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-brand-100"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center overflow-auto bg-slate-100 py-6">
          <Document
            file={`/api/editions/${openEditionId}/file`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center gap-2 py-20 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Carregando página...
              </div>
            }
            error={
              <div className="max-w-sm px-6 py-20 text-center text-sm text-slate-500">
                Não foi possível exibir o PDF neste navegador.{" "}
                <a
                  className="text-brand-600 underline"
                  href={`/api/editions/${openEditionId}/file?download=1`}
                >
                  Baixe o arquivo
                </a>
                .
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={BASE_WIDTH * zoom}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow-lg"
            />
          </Document>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-4 border-t border-paper-200 bg-white py-2">
            <button
              onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
              disabled={pageNumber <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-500">
              Página {pageNumber} de {numPages}
            </span>
            <button
              onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
              disabled={pageNumber >= numPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
