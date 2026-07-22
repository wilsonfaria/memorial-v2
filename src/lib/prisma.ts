import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getDatabaseUrl } from "@/lib/db-config";

/**
 * The mariadb driver defaults connectionLimit to 10. A single request to a
 * page like `/` fires ~6 queries concurrently (layout data + page data), so
 * as few as 2 concurrent visitors could exhaust the default pool and start
 * throwing `pool timeout: ... (active=0 idle=0 limit=10)`. Raise it so normal
 * concurrent traffic doesn't starve the pool; respects an explicit
 * `connectionLimit` already present in the URL (e.g. set manually per-env).
 */
function withPoolLimit(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connectionLimit")) {
      parsed.searchParams.set("connectionLimit", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient(url: string) {
  const adapter = new PrismaMariaDb(withPoolLimit(url));
  return new PrismaClient({ adapter });
}

/**
 * `$connect()` on the driver-adapter client is effectively a no-op — the actual
 * TCP/auth handshake only happens lazily on the first query. So "testing" a
 * connection must run a real query, not just call $connect(), or bad
 * credentials/host/port will silently be accepted.
 */
async function pingDatabase(client: PrismaClient, timeoutMs = 5000): Promise<void> {
  await Promise.race([
    client.$queryRaw`SELECT 1`,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tempo limite ao conectar")), timeoutMs)
    ),
  ]);
}

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

/**
 * Lazily creates (and caches) the client on first real use. Must stay lazy —
 * `next build` imports every route module to collect page data, and that must
 * succeed even when no database is reachable yet (e.g. before the hosting
 * database has been created). Eagerly building the client at module load
 * time breaks the build in that scenario.
 */
function getCurrentClient(): PrismaClient {
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = createPrismaClient(getDatabaseUrl());
  }
  return globalForPrisma.prismaClient;
}

/**
 * Proxy so every existing `prisma.model.method()` call site keeps working
 * unchanged even after `reconnectPrisma` swaps the underlying client
 * (used by the admin DB settings page to apply new credentials live).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getCurrentClient() as object, prop, receiver);
  },
}) as PrismaClient;

/** Tries to really query with the given URL without affecting the live client. Returns true/false, never throws. */
export async function testDatabaseUrl(url: string): Promise<boolean> {
  const client = createPrismaClient(url);
  try {
    await pingDatabase(client);
    return true;
  } catch {
    return false;
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

/** Swaps the live Prisma client to a new connection. Verifies connectivity itself as a safety net. */
export async function reconnectPrisma(url: string): Promise<void> {
  const newClient = createPrismaClient(url);
  await pingDatabase(newClient);

  const previousClient = globalForPrisma.prismaClient;
  globalForPrisma.prismaClient = newClient;

  if (previousClient) {
    await previousClient.$disconnect().catch(() => {});
  }
}
