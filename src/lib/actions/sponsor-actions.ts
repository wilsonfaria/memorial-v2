"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSponsorUploadDir, deleteSponsorLogo, SPONSOR_UPLOAD_DIR, SPONSOR_PUBLIC_PREFIX } from "@/lib/sponsor-storage";
import type { SponsorPlacement } from "@/generated/prisma/client";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

const PLACEMENTS: SponsorPlacement[] = ["SIDEBAR", "FOOTER", "BOTH"];

export type ActionState = { error?: string; success?: string } | undefined;

async function saveLogoFile(file: File): Promise<string> {
  await ensureSponsorUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `sponsor-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(SPONSOR_UPLOAD_DIR, fileName), bytes);
  return `${SPONSOR_PUBLIC_PREFIX}/${fileName}`;
}

export async function createSponsorAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const placement = String(formData.get("placement") ?? "BOTH") as SponsorPlacement;
  const order = Number(formData.get("order") ?? 0);
  const active = formData.get("active") === "on";
  const file = formData.get("logo");

  if (name.length < 2) return { error: "Informe o nome do patrocinador." };
  if (!PLACEMENTS.includes(placement)) return { error: "Posição inválida." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione a imagem do logo." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "O arquivo deve ser uma imagem." };
  }

  const logoUrl = await saveLogoFile(file);

  await prisma.sponsor.create({
    data: { name, linkUrl: linkUrl || null, placement, order, active, logoUrl },
  });

  revalidatePath("/admin/patrocinadores");
  revalidatePath("/", "layout");
  return { success: "Patrocinador criado com sucesso." };
}

export async function updateSponsorAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const placement = String(formData.get("placement") ?? "BOTH") as SponsorPlacement;
  const order = Number(formData.get("order") ?? 0);
  const active = formData.get("active") === "on";
  const file = formData.get("logo");

  if (name.length < 2) return { error: "Informe o nome do patrocinador." };
  if (!PLACEMENTS.includes(placement)) return { error: "Posição inválida." };

  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return { error: "Patrocinador não encontrado." };

  let logoUrl = existing.logoUrl;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "O arquivo deve ser uma imagem." };
    }
    logoUrl = await saveLogoFile(file);
    await deleteSponsorLogo(existing.logoUrl);
  }

  await prisma.sponsor.update({
    where: { id },
    data: { name, linkUrl: linkUrl || null, placement, order, active, logoUrl },
  });

  revalidatePath("/admin/patrocinadores");
  revalidatePath("/", "layout");
  return { success: "Patrocinador atualizado com sucesso." };
}

export async function deleteSponsorAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (sponsor) {
    await deleteSponsorLogo(sponsor.logoUrl);
    await prisma.sponsor.delete({ where: { id } });
  }

  revalidatePath("/admin/patrocinadores");
  revalidatePath("/", "layout");
}
