"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureNewspaperUploadDir,
  deleteNewspaperLogo,
  NEWSPAPER_UPLOAD_DIR,
  NEWSPAPER_PUBLIC_PREFIX,
} from "@/lib/newspaper-storage";
import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

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

export type ActionState = { error?: string; success?: string } | undefined;

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

/** Updates the site's primary identity (name, tagline, logo) — the "site identity" panel in Aparência. */
export async function updateSiteIdentityAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logo = formData.get("logo");

  if (name.length < 2) {
    return { error: "Informe um nome válido para o jornal." };
  }

  const existing = await prisma.newspaper.findFirst({ orderBy: { id: "asc" } });

  let logoUrl = existing?.logoUrl ?? null;
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) {
      return { error: "A logo deve ser uma imagem." };
    }
    if (logo.size > MAX_IMAGE_BYTES) {
      return { error: `A logo deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    await ensureNewspaperUploadDir();
    const ext = (logo.type.split("/")[1] || "png").replace("svg+xml", "svg");
    const fileName = `logo-${Date.now()}.${ext}`;
    const bytes = Buffer.from(await logo.arrayBuffer());
    await writeFile(path.join(NEWSPAPER_UPLOAD_DIR, fileName), bytes);
    if (existing?.logoUrl) await deleteNewspaperLogo(existing.logoUrl);
    logoUrl = `${NEWSPAPER_PUBLIC_PREFIX}/${fileName}`;
  }

  if (existing) {
    await prisma.newspaper.update({
      where: { id: existing.id },
      data: { name, tagline: tagline || null, logoUrl },
    });
  } else {
    const slug = slugify(name);
    await prisma.newspaper.create({
      data: { name, slug, tagline: tagline || null, logoUrl },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/aparencia");
  revalidatePath("/admin/jornais");
  return { success: "Identidade do site atualizada." };
}
