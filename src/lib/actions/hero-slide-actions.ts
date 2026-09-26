"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureHomepageUploadDir,
  deleteHomepageFile,
  HOMEPAGE_UPLOAD_DIR,
  HOMEPAGE_PUBLIC_PREFIX,
} from "@/lib/homepage-storage";
import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";
import { isSafeHref } from "@/lib/safe-href";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

async function saveImageFile(file: File): Promise<string> {
  await ensureHomepageUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `hero-slide-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(HOMEPAGE_UPLOAD_DIR, fileName), bytes);
  return `${HOMEPAGE_PUBLIC_PREFIX}/${fileName}`;
}

function revalidate() {
  revalidatePath("/admin/pagina-inicial");
  revalidatePath("/");
}

/** Reads and validates the shared slide fields; returns an error message or the data. */
function readSlideFields(formData: FormData) {
  const headline = String(formData.get("headline") ?? "").trim();
  const subtext = String(formData.get("subtext") ?? "").trim();
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
  const ctaHref = String(formData.get("ctaHref") ?? "").trim();
  const published = formData.get("published") === "on";

  if (headline.length < 2) return { error: "Informe o título do slide." };
  if (ctaHref && !isSafeHref(ctaHref)) {
    return { error: "Link do botão inválido. Use um caminho do site (ex.: /edicoes) ou um endereço http(s)://." };
  }
  if (ctaLabel && !ctaHref) return { error: "Informe o link do botão (ou deixe o texto do botão vazio)." };

  return {
    data: {
      headline,
      subtext: subtext || null,
      ctaLabel: ctaLabel || null,
      ctaHref: ctaLabel ? ctaHref : null,
      published,
    },
  };
}

function readImage(formData: FormData): { file?: File; error?: string } {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return {};
  if (!file.type.startsWith("image/")) return { error: "A imagem de fundo deve ser uma imagem." };
  if (file.size > MAX_IMAGE_BYTES) return { error: `A imagem deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
  return { file };
}

export async function createHeroSlideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const fields = readSlideFields(formData);
  if (fields.error || !fields.data) return { error: fields.error };
  const image = readImage(formData);
  if (image.error) return { error: image.error };

  const last = await prisma.heroSlide.aggregate({ _max: { order: true } });
  const imageUrl = image.file ? await saveImageFile(image.file) : null;

  await prisma.heroSlide.create({
    data: { ...fields.data, imageUrl, order: (last._max.order ?? -1) + 1 },
  });

  revalidate();
  return { success: "Slide criado." };
}

export async function updateHeroSlideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const existing = await prisma.heroSlide.findUnique({ where: { id } });
  if (!existing) return { error: "Slide não encontrado." };

  const fields = readSlideFields(formData);
  if (fields.error || !fields.data) return { error: fields.error };
  const image = readImage(formData);
  if (image.error) return { error: image.error };

  let imageUrl = existing.imageUrl;
  if (image.file) {
    imageUrl = await saveImageFile(image.file);
  } else if (formData.get("removeImage") === "on") {
    imageUrl = null;
  }
  if (existing.imageUrl && imageUrl !== existing.imageUrl) await deleteHomepageFile(existing.imageUrl);

  await prisma.heroSlide.update({ where: { id }, data: { ...fields.data, imageUrl } });

  revalidate();
  return { success: "Slide atualizado." };
}

export async function deleteHeroSlideAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const slide = await prisma.heroSlide.findUnique({ where: { id } });
  if (slide) {
    await prisma.heroSlide.delete({ where: { id } });
    if (slide.imageUrl) await deleteHomepageFile(slide.imageUrl);
  }

  revalidate();
}

/** Swaps a slide with its neighbour (direction -1 = up, 1 = down) and renumbers all slides 0..n-1. */
export async function moveHeroSlideAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const direction = Number(formData.get("direction")) < 0 ? -1 : 1;

  const slides = await prisma.heroSlide.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } });
  const index = slides.findIndex((s) => s.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= slides.length) return;

  [slides[index], slides[target]] = [slides[target], slides[index]];
  await prisma.$transaction(
    slides.map((s, order) => prisma.heroSlide.update({ where: { id: s.id }, data: { order } }))
  );

  revalidate();
}
