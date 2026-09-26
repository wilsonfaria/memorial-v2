import { NextResponse } from "next/server";
import { recordBannerClick } from "@/lib/banners";

export const dynamic = "force-dynamic";

/**
 * Banner links point here so clicks can be counted, then redirect to the
 * banner's own URL. Only the stored http(s) link of that banner is ever used
 * as the target, so this can't be abused as an open redirect.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const target = await recordBannerClick(Number(id)).catch(() => null);
  return NextResponse.redirect(target ?? new URL("/", request.url), { status: 302 });
}
