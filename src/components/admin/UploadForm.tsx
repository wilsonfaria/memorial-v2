"use client";

import { useMemo, useRef, useState } from "react";
import { FolderUp, CheckCircle2, XCircle, Loader2, Ban } from "lucide-react";
import { parseFolderSelection, type ParsedUploadFile, type ParseError } from "@/lib/upload-parse";

type Newspaper = { id: number; name: string };

type UploadStatus = "pending" | "uploading" | "done" | "error" | "cancelled";
type UploadItem = ParsedUploadFile & { status: UploadStatus; error?: string };

const PER_FILE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export default function UploadForm({ newspapers }: { newspapers: Newspaper[] }) {
  const [newspaperId, setNewspaperId] = useState<number | "">(newspapers[0]?.id ?? "");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRequestedRef = useRef(false);
  const currentAbortRef = useRef<AbortController | null>(null);

  const summary = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "error" || i.status === "cancelled").length;
    return { done, failed, total: items.length };
  }, [items]);

  function handleFolderSelected(fileList: FileList | null) {
    if (!fileList) return;
    const { parsed, errors } = parseFolderSelection(Array.from(fileList));
    setItems(parsed.map((p) => ({ ...p, status: "pending" as const })));
    setErrors(errors);
  }

  function cancelUpload() {
    cancelRequestedRef.current = true;
    currentAbortRef.current?.abort();
  }

  async function startUpload() {
    if (!newspaperId) return;
    setUploading(true);
    cancelRequestedRef.current = false;

    for (let i = 0; i < items.length; i++) {
      if (cancelRequestedRef.current) {
        setItems((prev) =>
          prev.map((it, idx) => (idx >= i ? { ...it, status: "cancelled" } : it))
        );
        break;
      }

      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "uploading" } : it))
      );

      const item = items[i];
      const body = new FormData();
      body.set("newspaperId", String(newspaperId));
      body.set("year", String(item.year));
      body.set("month", String(item.month));
      body.set("publishedAt", item.publishedAt.toISOString());
      if (item.editionNumber != null) body.set("editionNumber", String(item.editionNumber));
      body.set("title", item.title);
      body.set("file", item.file);

      const controller = new AbortController();
      currentAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), PER_FILE_TIMEOUT_MS);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body,
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Erro HTTP ${res.status}`);
        }
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "done" } : it))
        );
      } catch (e) {
        const wasCancelledByUser = cancelRequestedRef.current;
        const message = wasCancelledByUser
          ? "Cancelado."
          : e instanceof DOMException && e.name === "AbortError"
            ? "Tempo esgotado ao enviar este arquivo."
            : (e as Error).message;
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: wasCancelledByUser ? "cancelled" : "error", error: message } : it
          )
        );
      } finally {
        clearTimeout(timeoutId);
        currentAbortRef.current = null;
      }
    }

    setUploading(false);
  }

  if (newspapers.length === 0) {
    return <p className="text-sm text-slate-400">Cadastre um jornal antes de enviar edições.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-xs flex-col gap-1 text-xs">
        <span className="font-medium text-slate-500">Jornal de destino</span>
        <select
          value={newspaperId}
          onChange={(e) => setNewspaperId(Number(e.target.value))}
          disabled={uploading}
          className="rounded-lg border border-brand-200 px-2 py-2 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
        >
          {newspapers.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          // @ts-expect-error non-standard attributes for directory selection
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => handleFolderSelected(e.target.files)}
        />
        <FolderUp className="mx-auto mb-2 text-brand-400" size={28} />
        <p className="mb-3 text-sm text-slate-600">
          Selecione a pasta raiz com a estrutura <strong>Década / Ano / Mês / PDFs</strong>
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Escolher pasta
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <p className="mb-1 font-medium">{errors.length} arquivo(s) ignorado(s):</p>
          <ul className="max-h-32 list-disc overflow-y-auto pl-4">
            {errors.map((e, i) => (
              <li key={i}>
                {e.relativePath}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {items.length} edições identificadas
              {summary.total > 0 && uploading ? ` · ${summary.done + summary.failed}/${summary.total} processadas` : ""}
            </p>
            <div className="flex gap-2">
              {uploading && (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Ban size={14} />
                  Cancelar envio
                </button>
              )}
              <button
                type="button"
                onClick={startUpload}
                disabled={uploading || !newspaperId}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                {uploading ? "Enviando..." : "Iniciar envio"}
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-paper-200">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-paper-100 px-3 py-1.5 text-xs last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-slate-600">{item.relativePath}</span>
                {item.editionNumber != null && (
                  <span className="ml-2 shrink-0 text-slate-400">nº {item.editionNumber}</span>
                )}
                <span className="ml-2 shrink-0 text-slate-400">
                  {item.publishedAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
                <span className="ml-2 w-5 shrink-0 text-center">
                  {item.status === "uploading" && (
                    <Loader2 size={13} className="mx-auto animate-spin text-brand-500" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 size={13} className="mx-auto text-green-600" />
                  )}
                  {(item.status === "error" || item.status === "cancelled") && (
                    <span title={item.error}>
                      <XCircle size={13} className="mx-auto text-red-600" />
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
