"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureStorageDir, deletePdfFile } from "@/lib/storage";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string } | undefined;

export async function createEditionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const monthId = Number(formData.get("monthId"));
  const title = String(formData.get("title") ?? "").trim();
  const editionNumberRaw = String(formData.get("editionNumber") ?? "").trim();
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  const file = formData.get("file");

  if (!monthId) return { error: "Selecione o mês da edição." };
  if (title.length < 2) return { error: "Informe um título para a edição." };
  if (!publishedAtRaw) return { error: "Informe a data de publicação." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione o arquivo PDF da edição." };
  }
  if (file.type !== "application/pdf") {
    return { error: "O arquivo deve ser um PDF." };
  }

  const month = await prisma.month.findUnique({
    where: { id: monthId },
    include: { year: true },
  });
  if (!month) return { error: "Mês não encontrado." };

  const editionNumber = editionNumberRaw ? Number(editionNumberRaw) : null;
  const publishedAt = new Date(publishedAtRaw);

  const edition = await prisma.edition.create({
    data: {
      title,
      editionNumber,
      publishedAt,
      pdfPath: "",
      monthId,
    },
  });

  const relDir = path.join(String(month.year.year), String(month.month).padStart(2, "0"));
  await ensureStorageDir(relDir);
  const fileName = `edicao-${edition.id}.pdf`;
  const relPath = path.join(relDir, fileName).replace(/\\/g, "/");

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(process.cwd(), "storage", "pdfs", relPath), bytes);

  await prisma.edition.update({
    where: { id: edition.id },
    data: { pdfPath: relPath, fileSizeBytes: bytes.byteLength },
  });

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
  revalidatePath(`/mes/${monthId}`);
}

export async function deleteEditionAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const edition = await prisma.edition.findUnique({ where: { id } });
  if (edition) {
    await deletePdfFile(edition.pdfPath);
    await prisma.edition.delete({ where: { id } });
  }

  revalidatePath("/admin/edicoes");
  revalidatePath("/");
  revalidatePath("/edicoes");
}
