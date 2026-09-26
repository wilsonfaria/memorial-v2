import Link from "next/link";
import { CalendarRange, CalendarDays, Calendar, Newspaper, PenLine, ArrowRight } from "lucide-react";

const CARDS = [
  { key: "navDecadasImageUrl", href: "/decadas", label: "Décadas", description: "Navegue por períodos históricos", icon: CalendarRange },
  { key: "navAnosImageUrl", href: "/anos", label: "Anos", description: "Escolha o ano desejado", icon: CalendarDays },
  { key: "navMesesImageUrl", href: "/meses", label: "Meses", description: "Veja as edições do mês", icon: Calendar },
  { key: "navEdicoesImageUrl", href: "/edicoes", label: "Edições", description: "Leia a edição completa", icon: Newspaper },
  { key: "navCronicasImageUrl", href: "/cronicas", label: "Crônicas", description: "Histórias que inspiram", icon: PenLine },
] as const;

type CardImages = Record<(typeof CARDS)[number]["key"], string | null>;

export default function QuickNavCards({ images }: { images: CardImages }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map(({ key, href, label, description, icon: Icon }) => {
          const imageUrl = images[key];
          return (
            <Link
              key={href}
              href={href}
              className="group overflow-hidden rounded-lg border border-paper-200 bg-white hover:border-brand-300 hover:shadow-md"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#d9cbb0] via-[#c9b995] to-[#a8926c]">
                  <Icon size={30} className="text-brand-900/70" strokeWidth={1.5} />
                </div>
              )}
              <div className="p-3">
                <p className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-brand-900">
                  {label}
                  <ArrowRight size={13} className="text-accent-600 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
