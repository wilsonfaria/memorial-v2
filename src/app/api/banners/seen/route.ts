import { NextResponse } from "next/server";
import { recordBannerViews } from "@/lib/banners";

export const dynamic = "force-dynamic";

/** Body: { ids: number[] } — banners whose strip actually came on screen. */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const ids = Array.isArray((body as { ids?: unknown })?.ids) ? (body as { ids: unknown[] }).ids.map(Number) : [];
    await recordBannerViews(ids);
  } catch {
    // Malformed body or counting failure — nothing for the visitor to act on.
  }
  return new NextResponse(null, { status: 204 });
}
