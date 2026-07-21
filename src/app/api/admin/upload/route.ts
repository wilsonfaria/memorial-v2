import path from "node:path";
import { writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureStorageDir } from "@/lib/storage";
import { MAX_PDF_BYTES, formatMaxSize } from "@/lib/upload-limits";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const newspaperId = Number(formData.get("newspaperId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const editionNumberRaw = formData.get("editionNumber");
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!newspaperId || !year || !month || month < 1 || month > 12) {
    return Response.json({ error: "Dados de categoria inválidos" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "O arquivo deve ser um PDF." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json(
      { error: `O arquivo deve ter no máximo ${formatMaxSize(MAX_PDF_BYTES)}.` },
      { status: 400 }
    );
  }
  if (!title) {
    return Response.json({ error: "Título ausente" }, { status: 400 });
  }

  const newspaper = await prisma.newspaper.findUnique({ where: { id: newspaperId } });
  if (!newspaper) {
    return Response.json({ error: "Jornal não encontrado" }, { status: 404 });
  }

  const startYear = Math.floor(year / 10) * 10;

  const decade = await prisma.decade.upsert({
    where: { newspaperId_startYear: { newspaperId, startYear } },
    update: {},
    create: { newspaperId, startYear, label: String(startYear) },
  });

  const yearRow = await prisma.year.upsert({
    where: { decadeId_year: { decadeId: decade.id, year } },
    update: {},
    create: { decadeId: decade.id, year },
  });

  const monthRow = await prisma.month.upsert({
    where: { yearId_month: { yearId: yearRow.id, month } },
    update: {},
    create: { yearId: yearRow.id, month },
  });

  const editionNumber = editionNumberRaw ? Number(editionNumberRaw) : null;
  const parsedPublishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
  const publishedAt =
    parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime())
      ? parsedPublishedAt
      : new Date(Date.UTC(year, month - 1, 1));

  const edition = await prisma.edition.create({
    data: {
      title,
      editionNumber,
      publishedAt,
      pdfPath: "",
      monthId: monthRow.id,
    },
  });

  const relDir = path.join(String(year), String(month).padStart(2, "0"));
  await ensureStorageDir(relDir);
  const fileName = `edicao-${edition.id}.pdf`;
  const relPath = path.join(relDir, fileName).replace(/\\/g, "/");

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(process.cwd(), "storage", "pdfs", relPath), bytes);

  await prisma.edition.update({
    where: { id: edition.id },
    data: { pdfPath: relPath, fileSizeBytes: bytes.byteLength },
  });

  return Response.json({ ok: true, editionId: edition.id });
}
