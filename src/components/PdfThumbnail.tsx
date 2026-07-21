"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const fallback = (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-support-50 to-support-100">
    <FileText size={40} className="text-support-400" />
  </div>
);

export default function PdfThumbnail({ editionId, width }: { editionId: number; width: number }) {
  return (
    <Document
      file={`/api/editions/${editionId}/file`}
      loading={fallback}
      error={fallback}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-white"
    >
      <Page
        pageNumber={1}
        width={width}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </Document>
  );
}
