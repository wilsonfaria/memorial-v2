"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { deletePdfFile } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

async function removeEditionFiles(where: Prisma.EditionWhereInput) {
  const editions = await prisma.edition.findMany({ where, select: { pdfPath: true } });
  await Promise.all(editions.map((e) => deletePdfFile(e.pdfPath)));
}

export type ActionState = { error?: string } | undefined;

// --- Decade ---

export async function createDecadeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const newspaperId = Number(formData.get("newspaperId"));
  const startYear = Number(formData.get("startYear"));

  if (!newspaperId || !Number.isInteger(startYear) || startYear < 1800 || startYear > 2200) {
    return { error: "Informe um ano inicial de década válido." };
  }

  const roundedStart = Math.floor(startYear / 10) * 10;

  const existing = await prisma.decade.findUnique({
    where: { newspaperId_startYear: { newspaperId, startYear: roundedStart } },
  });
  if (existing) {
    return { error: "Essa década já existe para este jornal." };
  }

  await prisma.decade.create({
    data: { newspaperId, startYear: roundedStart, label: String(roundedStart) },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

export async function deleteDecadeAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await removeEditionFiles({ month: { year: { decadeId: id } } });
  await prisma.decade.delete({ where: { id } });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

// --- Year ---

export async function createYearAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const decadeId = Number(formData.get("decadeId"));
  const year = Number(formData.get("year"));

  const decade = await prisma.decade.findUnique({ where: { id: decadeId } });
  if (!decade) return { error: "Década não encontrada." };

  if (!Number.isInteger(year) || year < decade.startYear || year > decade.startYear + 9) {
    return { error: `O ano deve estar entre ${decade.startYear} e ${decade.startYear + 9}.` };
  }

  const existing = await prisma.year.findUnique({
    where: { decadeId_year: { decadeId, year } },
  });
  if (existing) return { error: "Esse ano já existe nesta década." };

  await prisma.year.create({ data: { decadeId, year } });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

export async function deleteYearAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await removeEditionFiles({ month: { yearId: id } });
  await prisma.year.delete({ where: { id } });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

// --- Month ---

export async function createMonthAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const yearId = Number(formData.get("yearId"));
  const month = Number(formData.get("month"));

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "Mês inválido." };
  }

  const existing = await prisma.month.findUnique({
    where: { yearId_month: { yearId, month } },
  });
  if (existing) return { error: "Esse mês já existe neste ano." };

  await prisma.month.create({ data: { yearId, month } });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

export async function deleteMonthAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await removeEditionFiles({ monthId: id });
  await prisma.month.delete({ where: { id } });

  revalidatePath("/admin/categorias");
  revalidatePath("/");
}
