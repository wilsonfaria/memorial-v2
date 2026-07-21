import { headers } from "next/headers";

type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

/**
 * Fixed-window rate limiter, in-memory (single Node process). Good enough for
 * a low-traffic single-instance deploy; would need a shared store (Redis) if
 * this app ever runs behind multiple instances/processes.
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map doesn't grow unbounded over time.
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) {
        if (v.resetAt < now) attempts.delete(k);
      }
    }
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}
