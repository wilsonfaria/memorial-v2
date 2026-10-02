import Link from "next/link";
import { Plus } from "lucide-react";

export default function AdminNewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
    >
      <Plus size={16} />
      {label}
    </Link>
  );
}
