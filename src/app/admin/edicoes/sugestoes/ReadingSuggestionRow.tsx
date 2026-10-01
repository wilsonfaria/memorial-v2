"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import {
  approveTranscriptionSuggestionAction,
  rejectTranscriptionSuggestionAction,
} from "@/lib/actions/transcription-suggestion-actions";
import { formatDate } from "@/lib/format";

type Suggestion = {
  id: number;
  editionId: number;
  page: number;
  contextBefore: string;
  contextAfter: string;
  suggestion: string;
  submitterName: string | null;
  createdAt: Date;
  /** False when the transcription changed and the [ilegível] can't be found anymore. */
  applicable: boolean;
  edition: { title: string; editionNumber: number | null; publishedAt: Date };
};

/** Context comes from the stored transcription; its "### " heading markers read as a paragraph break. */
const plain = (s: string) => s.replace(/#{3}\s*/g, "¶ ");

export default function ReadingSuggestionRow({ suggestion: s }: { suggestion: Suggestion }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    startTransition(async () => {
      const r = await approveTranscriptionSuggestionAction(s.id);
      setError(r.error ?? null);
    });
  }

  function reject() {
    startTransition(() => rejectTranscriptionSuggestionAction(s.id));
  }

  return (
    <div className="rounded-lg border border-paper-200 bg-white p-3">
      <p className="text-xs text-slate-400">
        <Link href={`/admin/edicoes/${s.editionId}`} className="font-medium text-slate-500 hover:text-brand-700">
          {s.edition.editionNumber != null ? `Edição nº ${s.edition.editionNumber}` : s.edition.title}
        </Link>{" "}
        ({formatDate(s.edition.publishedAt)}) · pág. {s.page} · enviada em {formatDate(s.createdAt)}
        {s.submitterName && ` · por ${s.submitterName}`}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        …{plain(s.contextBefore)}{" "}
        <span className="rounded bg-amber-100 px-0.5 text-amber-800 line-through">[ilegível]</span>{" "}
        <strong className="rounded bg-green-100 px-1 text-green-800">{s.suggestion}</strong> {plain(s.contextAfter)}…
      </p>

      {!s.applicable && (
        <p className="mt-1.5 text-xs text-amber-700">
          A transcrição desta página mudou e o trecho não foi mais encontrado — só dá para rejeitar.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          onClick={approve}
          disabled={isPending || !s.applicable}
          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
        >
          <Check size={13} />
          Aprovar
        </button>
        <button
          onClick={reject}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          <X size={13} />
          Rejeitar
        </button>
      </div>
    </div>
  );
}
