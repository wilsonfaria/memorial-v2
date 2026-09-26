"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureGalleryUploadDir,
  deleteGalleryFile,
  GALLERY_UPLOAD_DIR,
  GALLERY_PUBLIC_PREFIX,
} from "@/lib/gallery-storage";
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
  await ensureGalleryUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(GALLERY_UPLOAD_DIR, fileName), bytes);
  return `${GALLERY_PUBLIC_PREFIX}/${fileName}`;
}

export async function createAlbumAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.galleryAlbum.findUnique({ where: { slug } });
  if (existing) return { error: `Já existe um álbum com o endereço "${slug}".` };

  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveImageFile(coverImage, "cover");
  }

  await prisma.galleryAlbum.create({
    data: { title, slug, description: description || null, order, published, coverImageUrl },
  });

  revalidatePath("/admin/galeria");
  revalidatePath("/", "layout");
  return { success: "Álbum criado com sucesso." };
}

export async function updateAlbumAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!existing) return { error: "Álbum não encontrado." };

  const slugConflict = await prisma.galleryAlbum.findFirst({ where: { slug, id: { not: id } } });
  if (slugConflict) return { error: `Já existe um álbum com o endereço "${slug}".` };

  let coverImageUrl = existing.coverImageUrl;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveImageFile(coverImage, "cover");
    if (existing.coverImageUrl) await deleteGalleryFile(existing.coverImageUrl);
  }

  await prisma.galleryAlbum.update({
    where: { id },
    data: { title, slug, description: description || null, order, published, coverImageUrl },
  });

  revalidatePath("/admin/galeria");
  revalidatePath("/", "layout");
  return { success: "Álbum atualizado com sucesso." };
}

/**
 * Adds ONE photo to an album. The admin form calls this once per selected
 * file (see AlbumRow.tsx) instead of posting every photo in a single request:
 * several 5MB photos together blow past the Server Action body limit
 * (serverActions.bodySizeLimit in next.config.ts) and would all be buffered
 * in RAM at once on the shared Hostinger box.
 */
export async function addAlbumPhotoAction(formData: FormData): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) return { error: "Nenhuma foto enviada." };
  if (!file.type.startsWith("image/")) return { error: `"${file.name}" não é uma imagem.` };
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `"${file.name}" passa de ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
  }

  const album = await prisma.galleryAlbum.findUnique({ where: { id }, select: { id: true } });
  if (!album) return { error: "Álbum não encontrado." };

  const currentMax = await prisma.galleryPhoto.aggregate({
    where: { albumId: id },
    _max: { order: true },
  });
  const url = await saveImageFile(file, "photo");
  await prisma.galleryPhoto.create({ data: { albumId: id, url, order: (currentMax._max.order ?? -1) + 1 } });

  revalidatePath("/admin/galeria");
  revalidatePath("/", "layout");
  return { success: "Foto adicionada." };
}

/** Moves the album (and its photos, along for the ride) to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteAlbumAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.galleryAlbum.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/galeria");
  revalidatePath("/", "layout");
}

export async function deletePhotoAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
  if (photo) {
    await deleteGalleryFile(photo.url);
    await prisma.galleryPhoto.delete({ where: { id } });
  }

  revalidatePath("/admin/galeria");
  revalidatePath("/", "layout");
}
