import Link from "next/link";
import FontSizeControl from "@/components/FontSizeControl";

export default function AccessibilityBar() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
      <Link href="/acessibilidade" className="hover:text-white hover:underline">
        Acessibilidade
      </Link>
      <FontSizeControl />
    </div>
  );
}
