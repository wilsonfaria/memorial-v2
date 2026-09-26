"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureSponsorUploadDir, deleteSponsorLogo, SPONSOR_UPLOAD_DIR, SPONSOR_PUBLIC_PREFIX } from "@/lib/sponsor-storage";
import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

// The site's audience is in Brazil (no DST since 2019), so admin-entered
// dates are pinned to UTC-3 rather than whatever timezone the host runs in.
const SITE_UTC_OFFSET = "-03:00";

async function saveLogoFile(file: File): Promise<string> {
  await ensureSponsorUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `sponsor-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(SPONSOR_UPLOAD_DIR, fileName), bytes);
  return `${SPONSOR_PUBLIC_PREFIX}/${fileName}`;
}

function revalidate() {
  revalidatePath("/admin/patrocinadores");
  revalidatePath("/apoiadores");
}

/** Parses the fields shared by create and update. Dates are whole days: start at 00:00, end at 23:59:59. */
function readBannerFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "on";
  const pinned = formData.get("pinned") === "on";
  const startDate = String(formData.get("startsAt") ?? "").trim();
  const endDate = String(formData.get("endsAt") ?? "").trim();
  const maxRaw = String(formData.get("maxAppearances") ?? "").trim();

  if (name.length < 2) return { error: "Informe o nome do banner." };
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) return { error: "O link deve começar com http:// ou https://." };

  let maxAppearances: number | null = null;
  if (maxRaw) {
    maxAppearances = Number(maxRaw);
    if (!Number.isInteger(maxAppearances) || maxAppearances < 1) {
      return { error: "O limite de aparições deve ser um número inteiro maior que zero (ou vazio para ilimitado)." };
    }
  }

  const startsAt = startDate ? new Date(`${startDate}T00:00:00${SITE_UTC_OFFSET}`) : null;
  const endsAt = endDate ? new Date(`${endDate}T23:59:59${SITE_UTC_OFFSET}`) : null;
  if ((startsAt && isNaN(startsAt.getTime())) || (endsAt && isNaN(endsAt.getTime()))) {
    return { error: "Data de início ou fim inválida." };
  }
  if (startsAt && endsAt && endsAt < startsAt) return { error: "A data de fim é anterior à de início." };

  return { data: { name, linkUrl: linkUrl || null, order, active, pinned, startsAt, endsAt, maxAppearances } };
}

function readLogo(formData: FormData, required: boolean): { file?: File; error?: string } {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return required ? { error: "Selecione a imagem do banner." } : {};
  if (!file.type.startsWith("image/")) return { error: "O arquivo deve ser uma imagem." };
  if (file.size > MAX_IMAGE_BYTES) return { error: `A imagem deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
  return { file };
}

export async function createSponsorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const fields = readBannerFields(formData);
  if (fields.error || !fields.data) return { error: fields.error };
  const logo = readLogo(formData, true);
  if (logo.error || !logo.file) return { error: logo.error };

  const logoUrl = await saveLogoFile(logo.file);
  await prisma.sponsor.create({ data: { ...fields.data, logoUrl } });

  revalidate();
  return { success: "Banner criado com sucesso." };
}

export async function updateSponsorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();

  const id = Number(formData.get("id"));
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return { error: "Banner não encontrado." };

  const fields = readBannerFields(formData);
  if (fields.error || !fields.data) return { error: fields.error };
  const logo = readLogo(formData, false);
  if (logo.error) return { error: logo.error };

  const logoUrl = logo.file ? await saveLogoFile(logo.file) : existing.logoUrl;
  await prisma.sponsor.update({ where: { id }, data: { ...fields.data, logoUrl } });
  if (logo.file) await deleteSponsorLogo(existing.logoUrl);

  revalidate();
  return { success: "Banner atualizado com sucesso." };
}

/** Quick pin/unpin from the list without opening the edit form. */
export async function toggleSponsorPinAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const banner = await prisma.sponsor.findUnique({ where: { id }, select: { pinned: true } });
  if (banner) await prisma.sponsor.update({ where: { id }, data: { pinned: !banner.pinned } });
  revalidate();
}

/** Zeroes lifetime counters and the per-day history — e.g. to start a new campaign with the same banner. */
export async function resetSponsorStatsAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  await prisma.$transaction([
    prisma.sponsor.update({ where: { id }, data: { appearances: 0, views: 0, clicks: 0 } }),
    prisma.sponsorDailyStat.deleteMany({ where: { sponsorId: id } }),
  ]);
  revalidate();
}

export async function updateBannerSlotsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const slots = Number(formData.get("bannerSlots"));
  if (!Number.isInteger(slots) || slots < 1 || slots > 50) {
    return { error: "Informe um número entre 1 e 50." };
  }
  await prisma.siteSetting.update({ where: { id: 1 }, data: { bannerSlots: slots } });
  revalidate();
  return { success: "Configuração salva." };
}

/** Moves the banner to the trash (see src/lib/trash.ts) instead of deleting it outright. */
export async function deleteSponsorAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));

  await prisma.sponsor.update({ where: { id }, data: { deletedAt: new Date() } }).catch(() => {});

  revalidate();
}
