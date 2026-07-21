import { prisma } from "@/lib/prisma";
import type { AnalyticsEventType } from "@/generated/prisma/client";

export async function recordAnalyticsEvent(type: AnalyticsEventType, editionId?: number) {
  try {
    await prisma.analyticsEvent.create({ data: { type, editionId } });
  } catch {
    // Analytics must never break the page/download it's instrumenting.
  }
}
