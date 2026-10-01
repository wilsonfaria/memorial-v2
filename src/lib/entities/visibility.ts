import { prisma } from "@/lib/prisma";
import { PRIVATE_KINDS } from "@/lib/entities/kinds";

/**
 * Kinds left out of the public site: the fixed LGPD floor (PRIVATE_KINDS,
 * never toggleable) plus whatever an admin additionally hid at /admin/materias.
 */
export async function getHiddenKinds(): Promise<Set<string>> {
  const rows = await prisma.hiddenArticleKind.findMany({ select: { kind: true } });
  return new Set<string>([...PRIVATE_KINDS, ...rows.map((r) => r.kind)]);
}
