import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

export const SPONSOR_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "sponsors");
export const SPONSOR_PUBLIC_PREFIX = "/uploads/sponsors";

export async function ensureSponsorUploadDir() {
  await mkdir(SPONSOR_UPLOAD_DIR, { recursive: true });
}

export async function deleteSponsorLogo(logoUrl: string) {
  if (!logoUrl.startsWith(SPONSOR_PUBLIC_PREFIX)) return;
  const fileName = path.basename(logoUrl);
  await rm(path.join(SPONSOR_UPLOAD_DIR, fileName), { force: true });
}
