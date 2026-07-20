"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ActionState = { error?: string } | undefined;

export async function createNewspaperAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (name.length < 2) {
    return { error: "Informe um nome válido para o jornal." };
  }

  const slug = slugify(name);
  const existing = await prisma.newspaper.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Já existe um jornal com esse nome." };
  }

  await prisma.newspaper.create({
    data: { name, slug, logoUrl: logoUrl || null },
  });

  revalidatePath("/admin/jornais");
  revalidatePath("/");
}

export async function deleteNewspaperAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await prisma.newspaper.delete({ where: { id } });
  revalidatePath("/admin/jornais");
  revalidatePath("/");
}
