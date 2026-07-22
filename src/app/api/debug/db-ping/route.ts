import net from "node:net";
import mariadb from "mariadb";
import { getEffectiveDbConfig } from "@/lib/db-config";

export const dynamic = "force-dynamic";

/**
 * Bypasses Prisma entirely so we get the real underlying error (code/errno)
 * instead of Prisma's generic "pool timeout" message. Capped well under the
 * Hostinger proxy's own timeout so a slow/hanging connection doesn't 503
 * before this route can respond with anything.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);
}

async function testTcp(host: string, port: number) {
  const start = Date.now();
  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", reject);
      }),
      3500,
      "tcp"
    );
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - start,
      code: (err as NodeJS.ErrnoException).code ?? null,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testHandshake(config: { host: string; port: number; user: string; password: string; database: string }) {
  const start = Date.now();
  let conn: mariadb.Connection | undefined;
  try {
    conn = await withTimeout(
      mariadb.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 3500,
      }),
      3500,
      "handshake"
    );
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { errno?: number; sqlState?: string };
    return {
      ok: false,
      ms: Date.now() - start,
      code: e.code ?? null,
      errno: e.errno ?? null,
      sqlState: e.sqlState ?? null,
      message: e.message ?? String(err),
    };
  } finally {
    await conn?.end().catch(() => {});
  }
}

export async function GET() {
  const config = getEffectiveDbConfig();
  if (!config) {
    return Response.json({ error: "Nenhuma configuração de banco encontrada (nem arquivo salvo, nem DATABASE_URL)." }, { status: 500 });
  }

  const [tcp, handshake] = await Promise.all([testTcp(config.host, config.port), testHandshake(config)]);

  return Response.json({
    target: { host: config.host, port: config.port, database: config.database, user: config.user },
    tcp,
    handshake,
  });
}
