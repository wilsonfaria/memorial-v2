"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensurePageUploadDir, deletePageImageFile, PAGE_UPLOAD_DIR, PAGE_PUBLIC_PREFIX } from "@/lib/page-storage";
import { sanitizePageHtml } from "@/lib/sanitize-html";
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

async function saveImageFile(file: File, prefix: string): Promise<string> {
  await ensurePageUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(PAGE_UPLOAD_DIR, fileName), bytes);
  return `${PAGE_PUBLIC_PREFIX}/${fileName}`;
}

export async function createPageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const menuLabel = String(formData.get("menuLabel") ?? "").trim();
  const menuOrder = Number(formData.get("menuOrder") ?? 0);
  const showInMenu = formData.get("showInMenu") === "on";
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo da página não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido para essa página." };

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) return { error: `Já existe uma página com o endereço "${slug}".` };

  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveImageFile(coverImage, "cover");
  }

  await prisma.page.create({
    data: {
      title,
      slug,
      body,
      coverImageUrl,
      menuLabel: menuLabel || null,
      menuOrder,
      showInMenu,
      published,
    },
  });

  revalidatePath("/admin/paginas");
  revalidatePath("/", "layout");
  return { success: "Página criada com sucesso." };
}

export async function updatePageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const menuLabel = String(formData.get("menuLabel") ?? "").trim();
  const menuOrder = Number(formData.get("menuOrder") ?? 0);
  const showInMenu = formData.get("showInMenu") === "on";
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo da página não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido para essa página." };

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { error: "Página não encontrada." };

  const slugConflict = await prisma.page.findFirst({ where: { slug, id: { not: id } } });
  if (slugConflict) return { error: `Já existe uma página com o endereço "${slug}".` };

  let coverImageUrl = existing.coverImageUrl;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveImageFile(coverImage, "cover");
    if (existing.coverImageUrl) await deletePageImageFile(existing.coverImageUrl);
  }

  await prisma.page.update({
    where: { id },
    data: {
      title,
      slug,
      body,
      coverImageUrl,
      menuLabel: menuLabel || null,
      menuOrder,
      showInMenu,
      published,
    },
  });

  revalidatePath("/admin/paginas");
  revalidatePath("/", "layout");
  return { success: "Página atualizada com sucesso." };
}

/**
 * Adds ONE gallery image to a page. PageRow.tsx calls this once per selected
 * file rather than posting them all together, which would exceed the Server
 * Action body limit (serverActions.bodySizeLimit in next.config.ts).
 */
export async function addPageImageAction(formData: FormData): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) return { error: "Nenhuma imagem enviada." };
  if (!file.type.startsWith("image/")) return { error: `"${file.name}" não é uma imagem.` };
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `"${file.name}" passa de ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
  }

  const page = await prisma.page.findUnique({ where: { id }, select: { id: true } });
  if (!page) return { error: "Página não encontrada." };

  const currentMax = await prisma.pageImage.aggregate({
    where: { pageId: id },
    _max: { order: true },
  });
  const url = await saveImageFile(file, "gallery");
  await prisma.pageImage.create({ data: { pageId: id, url, order: (currentMax._max.order ?? -1) + 1 } });

  revalidatePath("/admin/paginas");
  revalidatePath("/", "layout");
  return { success: "Imagem adicionada." };
}

/** Moves the page to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deletePageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.page.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/paginas");
  revalidatePath("/", "layout");
}

export async function deletePageImageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const image = await prisma.pageImage.findUnique({ where: { id } });
  if (image) {
    await deletePageImageFile(image.url);
    await prisma.pageImage.delete({ where: { id } });
  }

  revalidatePath("/admin/paginas");
  revalidatePath("/", "layout");
}
