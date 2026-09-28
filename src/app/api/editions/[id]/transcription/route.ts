import { prisma } from "@/lib/prisma";

/**
 * AI transcription of one page (?page=N) for the public reader's
 * "Transcrição" panel. `text` is null when the page hasn't been transcribed
 * yet; the original OCR text is deliberately not served — it's too noisy to
 * read and only exists for search.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isInteger(page) || page < 1) return Response.json({ error: "Página inválida" }, { status: 400 });

  const row = await prisma.editionPage.findFirst({
    where: { editionId: Number(id), page, edition: { deletedAt: null } },
    select: { revisedText: true, revisedModel: true, revisedAt: true },
  });

  return Response.json(
    {
      page,
      text: row?.revisedText ?? null,
      model: row?.revisedModel ?? null,
      revisedAt: row?.revisedAt ?? null,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
