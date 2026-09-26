import { NextResponse } from "next/server";
import { selectBannersForView } from "@/lib/banners";

export const dynamic = "force-dynamic";

/**
 * POST (not GET) because every call counts appearances: browsers and
 * crawlers never prefetch or cache a POST, so one call = one page view.
 */
export async function POST() {
  try {
    const banners = await selectBannersForView();
    return NextResponse.json({ banners }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ banners: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
