"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureProjectUploadDir,
  deleteProjectFile,
  PROJECT_UPLOAD_DIR,
  PROJECT_PUBLIC_PREFIX,
} from "@/lib/project-storage";
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
  await ensureProjectUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `project-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(PROJECT_UPLOAD_DIR, fileName), bytes);
  return `${PROJECT_PUBLIC_PREFIX}/${fileName}`;
}

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo do projeto não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) return { error: `Já existe um projeto com o endereço "${slug}".` };

  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveCoverFile(coverImage);
  }

  await prisma.project.create({
    data: { title, slug, summary: summary || null, body, order, published, coverImageUrl },
  });

  revalidatePath("/admin/projetos");
  revalidatePath("/", "layout");
  return { success: "Projeto criado com sucesso." };
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = sanitizePageHtml(String(formData.get("body") ?? "").trim());
  const order = Number(formData.get("order") ?? 0);
  const published = formData.get("published") === "on";
  const coverImage = formData.get("coverImage");

  if (title.length < 2) return { error: "Informe um título." };
  if (body.length < 1) return { error: "O conteúdo do projeto não pode ficar vazio." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "Não foi possível gerar um endereço (slug) válido." };

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return { error: "Projeto não encontrado." };

  const slugConflict = await prisma.project.findFirst({ where: { slug, id: { not: id } } });
  if (slugConflict) return { error: `Já existe um projeto com o endereço "${slug}".` };

  let coverImageUrl = existing.coverImageUrl;
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) return { error: "A capa deve ser uma imagem." };
    if (coverImage.size > MAX_IMAGE_BYTES) {
      return { error: `A capa deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
    }
    coverImageUrl = await saveCoverFile(coverImage);
    if (existing.coverImageUrl) await deleteProjectFile(existing.coverImageUrl);
  }

  await prisma.project.update({
    where: { id },
    data: { title, slug, summary: summary || null, body, order, published, coverImageUrl },
  });

  revalidatePath("/admin/projetos");
  revalidatePath("/", "layout");
  return { success: "Projeto atualizado com sucesso." };
}

/** Moves the project to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteProjectAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidatePath("/admin/projetos");
  revalidatePath("/", "layout");
}
