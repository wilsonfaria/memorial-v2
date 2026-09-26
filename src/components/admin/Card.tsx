import type { ReactNode } from "react";

/**
 * Surface for a group of related controls, lifting it off the page's grey
 * background. Padding is deliberately generous (p-6) so dense admin forms
 * don't read as cramped against the card border.
 */
export default function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section className={`rounded-xl border border-paper-200 bg-white p-6 shadow-sm ${className}`}>
      {hasHeader && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
            {description && (
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
