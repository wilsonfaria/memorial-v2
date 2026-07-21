import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="w-full border-b border-paper-200 bg-white/70">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2.5 text-xs text-slate-500 sm:px-6 lg:px-8">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-brand-300">•</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-accent-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
