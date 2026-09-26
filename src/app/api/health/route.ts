import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for the container HEALTHCHECK (see Dockerfile).
 * Side-effect free on purpose: page routes record SITE_VISIT analytics and
 * /api/banners/view counts banner appearances, so neither can be polled.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
