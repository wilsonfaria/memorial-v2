"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureCharacterUploadDir,
  deleteCharacterFile,
  CHARACTER_UPLOAD_DIR,
  CHARACTER_PUBLIC_PREFIX,
} from "@/lib/character-storage";
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

async function savePhotoFile(file: File): Promise<string> {
  await ensureCharacterUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `character-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(CHARACTER_UPLOAD_DIR, fileName), bytes);
  return `${CHARACTER_PUBLIC_PREFIX}/${fileName}`;
}

function parseOptionalYear(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const year = Number(value);
  return Number.isInteger(year) ? year : null;
}

export async function createCharacterAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const bio = sanitizePageHtml(String(formData.get("bio") ?? "").trim());
  const bornYear = parseOptionalYear(formData.get("bornYear"));
  const diedYear = parseOptionalYear(formData.get("diedYear"));
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const photo = formData.get("photo");

  if (name.length < 2) return { error: "Informe o nome." };
  if (bio.length < 1) return { error: "A biografia não pode ficar vazia." };

  const slug = slugify(slugRaw || name);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.character.findUnique({ where: { slug } });
  if (existing) return { error: `Já existe um personagem com o endereço "${slug}".` };

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "A foto deve ser uma imagem." };
    if (photo.size > MAX_IMAGE_BYTES) {
      return { error: `A foto deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    photoUrl = await savePhotoFile(photo);
  }

  await prisma.character.create({
    data: { name, slug, role: role || null, bio, bornYear, diedYear, order, published, photoUrl },
  });

  revalidatePath("/admin/personagens");
  revalidatePath("/", "layout");
  return { success: "Personagem criado com sucesso." };
}

export async function updateCharacterAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const bio = sanitizePageHtml(String(formData.get("bio") ?? "").trim());
  const bornYear = parseOptionalYear(formData.get("bornYear"));
  const diedYear = parseOptionalYear(formData.get("diedYear"));
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const photo = formData.get("photo");

  if (name.length < 2) return { error: "Informe o nome." };
  if (bio.length < 1) return { error: "A biografia não pode ficar vazia." };

  const slug = slugify(slugRaw || name);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.character.findUnique({ where: { id } });
  if (!existing) return { error: "Personagem não encontrado." };

  const slugConflict = await prisma.character.findFirst({ where: { slug, id: { not: id } } });
  if (slugConflict) return { error: `Já existe um personagem com o endereço "${slug}".` };

  let photoUrl = existing.photoUrl;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "A foto deve ser uma imagem." };
    if (photo.size > MAX_IMAGE_BYTES) {
      return { error: `A foto deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    photoUrl = await savePhotoFile(photo);
    if (existing.photoUrl) await deleteCharacterFile(existing.photoUrl);
  }

  await prisma.character.update({
    where: { id },
    data: { name, slug, role: role || null, bio, bornYear, diedYear, order, published, photoUrl },
  });

  revalidatePath("/admin/personagens");
  revalidatePath("/", "layout");
  return { success: "Personagem atualizado com sucesso." };
}

/** Moves the character to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteCharacterAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.character.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/personagens");
  revalidatePath("/", "layout");
}
