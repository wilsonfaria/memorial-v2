import { prisma } from "@/lib/prisma";
import { recordAnalyticsEvent } from "@/lib/analytics";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/editions/[id]">
) {
  const { id } = await ctx.params;
  const edition = await prisma.edition.findUnique({ where: { id: Number(id) } });

  if (!edition) {
    return Response.json({ error: "Edição não encontrada" }, { status: 404 });
  }

  await recordAnalyticsEvent("EDITION_VIEW", edition.id);

  return Response.json({
    id: edition.id,
    title: edition.title,
    editionNumber: edition.editionNumber,
    publishedAt: edition.publishedAt,
    fileSizeBytes: edition.fileSizeBytes,
    pageCount: edition.pageCount,
  });
}
