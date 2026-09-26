"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { approveCaptionSuggestionAction, rejectCaptionSuggestionAction } from "@/lib/actions/gallery-suggestion-actions";
import { formatDate } from "@/lib/format";

type Suggestion = {
  id: number;
  suggestion: string;
  submitterName: string | null;
  createdAt: Date;
  photo: {
    url: string;
    caption: string | null;
    album: { title: string; slug: string };
  };
};

export default function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const [isPending, startTransition] = useTransition();

  function approve() {
    const fd = new FormData();
    fd.set("id", String(suggestion.id));
    startTransition(() => approveCaptionSuggestionAction(fd));
  }

  function reject() {
    const fd = new FormData();
    fd.set("id", String(suggestion.id));
    startTransition(() => rejectCaptionSuggestionAction(fd));
  }

  return (
    <div className="flex gap-3 rounded-lg border border-paper-200 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={suggestion.photo.url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />

      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">
          Álbum <span className="font-medium text-slate-500">{suggestion.photo.album.title}</span> ·{" "}
          {formatDate(suggestion.createdAt)}
          {suggestion.submitterName && ` · enviado por ${suggestion.submitterName}`}
        </p>
        {suggestion.photo.caption && (
          <p className="mt-1 text-xs text-slate-400 line-through">{suggestion.photo.caption}</p>
        )}
        <p className="mt-1 text-sm text-slate-700">{suggestion.suggestion}</p>

        <div className="mt-2 flex gap-2">
          <button
            onClick={approve}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
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
    </div>
  );
}
