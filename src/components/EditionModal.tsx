"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEditionModal } from "@/context/EditionModalContext";
import { formatDateLong, formatFileSize } from "@/lib/format";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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

  useEffect(() => {
    if (openEditionId == null) {
      setEdition(null);
      setNumPages(null);
      setPageNumber(1);
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
        <div className="flex shrink-0 items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-brand-900">
              {edition?.title ?? "Carregando edição..."}
            </h2>
            {edition && (
              <p className="text-xs text-slate-500">
                {formatDateLong(new Date(edition.publishedAt))}
                {edition.fileSizeBytes ? ` · ${formatFileSize(edition.fileSizeBytes)}` : ""}
              </p>
            )}
          </div>
          <a
            href={`/api/editions/${openEditionId}/file?download=1`}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
            title="Baixar PDF"
          >
            <Download size={15} />
            Download
          </a>
          <button
            onClick={closeEdition}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-brand-100"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center overflow-y-auto bg-slate-100 py-6">
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
              width={640}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow-lg"
            />
          </Document>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-4 border-t border-brand-100 bg-white py-2">
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
