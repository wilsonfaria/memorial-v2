/**
 * Pure (client-safe) helpers describing where a sponsor banner is in its
 * lifecycle. Shared by the public selector (src/lib/banners.ts) and the
 * admin list, so "eligible to show" means the same thing in both places.
 */
export type BannerStatus = "active" | "inactive" | "scheduled" | "ended" | "capped";

type BannerLifecycle = {
  active: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  maxAppearances: number | null;
  appearances: number;
};

export function bannerStatus(banner: BannerLifecycle, now = new Date()): BannerStatus {
  if (!banner.active) return "inactive";
  if (banner.startsAt && new Date(banner.startsAt) > now) return "scheduled";
  if (banner.endsAt && new Date(banner.endsAt) < now) return "ended";
  if (banner.maxAppearances != null && banner.appearances >= banner.maxAppearances) return "capped";
  return "active";
}

export const BANNER_STATUS_LABEL: Record<BannerStatus, string> = {
  active: "No ar",
  inactive: "Inativo",
  scheduled: "Agendado",
  ended: "Encerrado",
  capped: "Limite atingido",
};
