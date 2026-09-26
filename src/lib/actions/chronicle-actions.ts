"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureChronicleUploadDir,
  deleteChronicleFile,
  CHRONICLE_UPLOAD_DIR,
  CHRONICLE_PUBLIC_PREFIX,
} from "@/lib/chronicle-storage";
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

async function saveCoverFile(file: File): Promise<string> {
  await ensureChronicleUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `chronicle-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(CHRONICLE_UPLOAD_DIR, fileName), bytes);
  return `${CHRONICLE_PUBLIC_PREFIX}/${fileName}`;
}

export async function createChronicleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const authorName = String(formData.get("authorName") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo da crônica não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.chronicle.findUnique({ where: { slug } });
  if (existing) return { error: `Já existe uma crônica com o endereço "${slug}".` };

  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveCoverFile(coverImage);
  }

  await prisma.chronicle.create({
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      body,
      authorName: authorName || null,
      order,
      published,
      coverImageUrl,
    },
  });

  revalidatePath("/admin/cronicas");
  revalidatePath("/", "layout");
  return { success: "Crônica criada com sucesso." };
}

export async function updateChronicleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const authorName = String(formData.get("authorName") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo da crônica não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.chronicle.findUnique({ where: { id } });
  if (!existing) return { error: "Crônica não encontrada." };

  const slugConflict = await prisma.chronicle.findFirst({ where: { slug, id: { not: id } } });
  if (slugConflict) return { error: `Já existe uma crônica com o endereço "${slug}".` };

  let coverImageUrl = existing.coverImageUrl;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveCoverFile(coverImage);
    if (existing.coverImageUrl) await deleteChronicleFile(existing.coverImageUrl);
  }

  await prisma.chronicle.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      body,
      authorName: authorName || null,
      order,
      published,
      coverImageUrl,
    },
  });

  revalidatePath("/admin/cronicas");
  revalidatePath("/", "layout");
  return { success: "Crônica atualizada com sucesso." };
}

/** Moves the chronicle to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteChronicleAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.chronicle.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/cronicas");
  revalidatePath("/", "layout");
}
