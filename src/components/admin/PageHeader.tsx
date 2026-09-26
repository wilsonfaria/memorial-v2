import type { ReactNode } from "react";

/**
 * Standard heading block for every admin screen: title on the left, optional
 * action on the right. The description is capped at `max-w-prose` so it keeps
 * a comfortable reading measure (~65 characters) even when the page container
 * is wide on large monitors.
 */
export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
