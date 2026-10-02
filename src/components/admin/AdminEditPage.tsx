import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/** Dedicated, document-style admin editing screen inspired by Joomla. */
export default function AdminEditPage({
  title,
  description,
  backHref,
  backLabel = "Voltar à lista",
  children,
}: {
  title: string;
  description?: ReactNode;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-paper-200 bg-brand-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">Edição</p>
            <h1 className="truncate text-xl font-semibold tracking-tight text-brand-900">{title}</h1>
          </div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-800"
          >
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
        </div>
      </div>

      {description && <p className="mb-5 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>}

      <section className="min-w-0 rounded-xl border border-paper-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        {children}
      </section>
    </div>
  );
}
