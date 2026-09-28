import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { entityKey } from "@/lib/entities/normalize";
import PageHeader from "@/components/admin/PageHeader";
import EntityRow from "./EntityRow";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
type Kind = "person" | "place";

export default async function AdminEntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; ocultas?: string; p?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const kind: Kind | undefined = params.tipo === "person" || params.tipo === "place" ? params.tipo : undefined;
  const onlyHidden = params.ocultas === "1";
  const page = Math.max(1, Number(params.p) || 1);

  // Same folded search as the public pages ("Motta" finds "Mota").
  const folded = q ? entityKey(q, kind ?? "person") : "";
  const where: Prisma.EntityWhereInput = {
    ...(kind ? { kind } : {}),
    ...(onlyHidden ? { hidden: true } : {}),
    ...(folded ? { OR: [{ key: { contains: folded } }, { name: { contains: q } }] } : {}),
  };
  const [total, entities, counts] = await Promise.all([
    prisma.entity.count({ where }),
    prisma.entity.findMany({
      where,
      orderBy: [{ hidden: "desc" }, { mentionCount: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        kind: true,
        name: true,
        slug: true,
        mentionCount: true,
        hidden: true,
        hiddenAt: true,
        hiddenNote: true,
        _count: { select: { mentions: true } },
      },
    }),
    prisma.entity.groupBy({ by: ["kind", "hidden"], _count: { _all: true } }),
  ]);
  const count = (k: Kind, hidden?: boolean) =>
    counts.filter((c) => c.kind === k && (hidden === undefined || c.hidden === hidden)).reduce((n, c) => n + c._count._all, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string | undefined>) => {
    const next = { q: q || undefined, tipo: kind, ocultas: onlyHidden ? "1" : undefined, ...over };
    const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1]));
    return `/admin/pessoas${qs.size ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-paper-200 hover:bg-brand-50"}`;

  return (
    <>
      <PageHeader
        title="Pessoas e lugares"
        description={
          <>
            Fichas montadas pela IA para <code>/pessoas</code> e <code>/lugares</code>. Ocultar atende a um pedido de
            correção ou retirada (LGPD): a ficha some do site, sai do “aparece junto com” e o nome é trocado por
            “[nome ocultado]” nas outras fichas. Continua oculta mesmo se a página for extraída de novo. O jornal não muda.
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <strong className="text-slate-700">{count("person")}</strong> pessoas ({count("person", true)} ocultas)
        </span>
        <span>
          <strong className="text-slate-700">{count("place")}</strong> lugares ({count("place", true)} ocultos)
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form action="/admin/pessoas" className="flex items-center gap-2">
          {kind && <input type="hidden" name="tipo" value={kind} />}
          {onlyHidden && <input type="hidden" name="ocultas" value="1" />}
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar nome"
              className="w-64 rounded-lg border border-brand-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
            />
          </div>
          <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link href={href({ tipo: undefined, p: undefined })} className={chip(!kind)}>
            Todos
          </Link>
          <Link href={href({ tipo: "person", p: undefined })} className={chip(kind === "person")}>
            Pessoas
          </Link>
          <Link href={href({ tipo: "place", p: undefined })} className={chip(kind === "place")}>
            Lugares
          </Link>
          <Link href={href({ ocultas: onlyHidden ? undefined : "1", p: undefined })} className={chip(onlyHidden)}>
            Só ocultas
          </Link>
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-400">
        {total} ficha(s){q ? ` para “${q}”` : ""} · ocultas primeiro, depois por número de menções públicas
      </p>

      <div className="flex flex-col gap-1">
        {entities.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nenhuma ficha encontrada.</p>}
        {entities.map(({ _count, ...e }) => (
          <EntityRow key={e.id} entity={{ ...e, kind: e.kind as Kind, totalMentions: _count.mentions }} />
        ))}
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href({ p: String(page - 1) })} className="text-brand-700 hover:underline">
              ← Anteriores
            </Link>
          )}
          <span className="text-slate-400">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <Link href={href({ p: String(page + 1) })} className="text-brand-700 hover:underline">
              Próximas →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
