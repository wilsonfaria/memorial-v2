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
import { getHomepageContent } from "@/lib/homepage";
import { parseBehindSteps, serializeBehindSteps } from "@/lib/behind-steps";
import { isSafeHref } from "@/lib/safe-href";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type ActionState = { error?: string; success?: string } | undefined;

async function saveImageFile(file: File, prefix: string): Promise<string> {
  await ensureHomepageUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(HOMEPAGE_UPLOAD_DIR, fileName), bytes);
  return `${HOMEPAGE_PUBLIC_PREFIX}/${fileName}`;
}

/**
 * Resolves one optional image field: a newly uploaded file replaces the
 * current one; otherwise the "`${fieldName}Remove`" checkbox clears it;
 * otherwise the current URL is kept. The replaced/removed file is returned
 * as `obsoleteUrl` rather than deleted here — the caller deletes it only
 * after the DB row points away from it, so a failure elsewhere in the form
 * never leaves the site referencing a file that's gone.
 */
async function resolveImageField(
  formData: FormData,
  fieldName: string,
  prefix: string,
  currentUrl: string | null
): Promise<{ url: string | null; uploaded?: boolean; obsoleteUrl?: string | null; error?: string }> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) {
    if (currentUrl && formData.get(`${fieldName}Remove`) === "on") {
      return { url: null, obsoleteUrl: currentUrl };
    }
    return { url: currentUrl };
  }

  if (!file.type.startsWith("image/")) return { url: currentUrl, error: "Um dos arquivos enviados não é uma imagem." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { url: currentUrl, error: `Cada imagem deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` };
  }

  const url = await saveImageFile(file, prefix);
  return { url, uploaded: true, obsoleteUrl: currentUrl };
}

export async function updateHomepageContentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const current = await getHomepageContent();

  // Hero image/headline/CTA now live in HeroSlide (hero-slide-actions.ts);
  // only the shared featured cover is edited here. (heroRibbonText is no
  // longer shown or edited — the column stays but is unused.)

  const videoTitle = String(formData.get("videoTitle") ?? "").trim();
  const videoSubtitle = String(formData.get("videoSubtitle") ?? "").trim();
  const videoEmbedUrl = String(formData.get("videoEmbedUrl") ?? "").trim();
  const videoButtonLabel = String(formData.get("videoButtonLabel") ?? "").trim();

  const behindTitle = String(formData.get("behindTitle") ?? "").trim();
  const behindSubtext = String(formData.get("behindSubtext") ?? "").trim();
  const behindLabels = String(formData.get("behindLabels") ?? "").trim();
  const behindButtonLabel = String(formData.get("behindButtonLabel") ?? "").trim();
  const behindButtonHref = String(formData.get("behindButtonHref") ?? "").trim();

  const behindSteps = parseBehindSteps(behindLabels);
  const badStep = behindSteps.find((s) => s.href && !isSafeHref(s.href));
  if (badStep) {
    return {
      error: `Link inválido na etapa "${badStep.label}". Use um caminho do site (ex.: /projetos) ou um endereço http(s)://.`,
    };
  }

  const fields = await Promise.all([
    // Single featured cover, stored in heroMockup1Url. heroMockup2Url is the
    // legacy second cover: it counts as "the" cover when slot 1 is empty, and
    // is always cleared on save (see legacyMockup2 below).
    resolveImageField(formData, "heroMockup1", "hero-mockup", current.heroMockup1Url ?? current.heroMockup2Url),
    resolveImageField(formData, "videoThumbnail", "video-thumb", current.videoThumbnailUrl),
    resolveImageField(formData, "behindPhoto1", "behind", current.behindPhoto1Url),
    resolveImageField(formData, "behindPhoto2", "behind", current.behindPhoto2Url),
    resolveImageField(formData, "behindPhoto3", "behind", current.behindPhoto3Url),
    resolveImageField(formData, "navDecadasImage", "nav", current.navDecadasImageUrl),
    resolveImageField(formData, "navAnosImage", "nav", current.navAnosImageUrl),
    resolveImageField(formData, "navMesesImage", "nav", current.navMesesImageUrl),
    resolveImageField(formData, "navEdicoesImage", "nav", current.navEdicoesImageUrl),
    resolveImageField(formData, "navCronicasImage", "nav", current.navCronicasImageUrl),
  ]);

  const imageError = fields.find((f) => f.error)?.error;
  if (imageError) {
    // Nothing is saved: drop the files this request just wrote.
    await Promise.all(fields.filter((f) => f.uploaded && f.url).map((f) => deleteHomepageFile(f.url!)));
    return { error: imageError };
  }

  const [
    heroMockup1,
    videoThumbnail,
    behindPhoto1,
    behindPhoto2,
    behindPhoto3,
    navDecadas,
    navAnos,
    navMeses,
    navEdicoes,
    navCronicas,
  ] = fields;

  await prisma.homepageContent.upsert({
    where: { id: 1 },
    update: {
      heroMockup1Url: heroMockup1.url,
      heroMockup2Url: null,
      videoTitle: videoTitle || "MEMÓRIA VIVA",
      videoSubtitle: videoSubtitle || null,
      videoEmbedUrl: videoEmbedUrl || null,
      videoButtonLabel: videoButtonLabel || "ASSISTA AO DOCUMENTÁRIO",
      videoThumbnailUrl: videoThumbnail.url,
      behindTitle: behindTitle || "Por trás do Memorial",
      behindSubtext: behindSubtext || null,
      behindLabels: serializeBehindSteps(behindSteps),
      behindButtonLabel: behindButtonLabel || "CONHEÇA O PROJETO",
      behindButtonHref: behindButtonHref || "/projetos",
      behindPhoto1Url: behindPhoto1.url,
      behindPhoto2Url: behindPhoto2.url,
      behindPhoto3Url: behindPhoto3.url,
      navDecadasImageUrl: navDecadas.url,
      navAnosImageUrl: navAnos.url,
      navMesesImageUrl: navMeses.url,
      navEdicoesImageUrl: navEdicoes.url,
      navCronicasImageUrl: navCronicas.url,
    },
    create: {
      id: 1,
      heroMockup1Url: heroMockup1.url,
      videoTitle: videoTitle || undefined,
      videoSubtitle: videoSubtitle || null,
      videoEmbedUrl: videoEmbedUrl || null,
      videoThumbnailUrl: videoThumbnail.url,
      behindTitle: behindTitle || undefined,
      behindSubtext: behindSubtext || null,
      behindLabels: serializeBehindSteps(behindSteps),
      behindPhoto1Url: behindPhoto1.url,
      behindPhoto2Url: behindPhoto2.url,
      behindPhoto3Url: behindPhoto3.url,
      navDecadasImageUrl: navDecadas.url,
      navAnosImageUrl: navAnos.url,
      navMesesImageUrl: navMeses.url,
      navEdicoesImageUrl: navEdicoes.url,
      navCronicasImageUrl: navCronicas.url,
    },
  });

  // The row no longer points at replaced/removed images — safe to delete them now.
  // When both legacy covers existed, slot 1 won and the old second cover is dropped.
  const legacyMockup2 = current.heroMockup1Url && current.heroMockup2Url ? current.heroMockup2Url : null;
  await Promise.all(
    [...fields.map((f) => f.obsoleteUrl), legacyMockup2]
      .filter((url): url is string => Boolean(url))
      .map((url) => deleteHomepageFile(url))
  );

  revalidatePath("/admin/pagina-inicial");
  revalidatePath("/", "layout");
  revalidatePath("/");
  return { success: "Página inicial atualizada." };
}
