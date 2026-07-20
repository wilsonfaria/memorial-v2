import net from "node:net";
import mariadb from "mariadb";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 3500;

/**
 * Temporary diagnostic route: tests raw TCP reachability AND a real MySQL/MariaDB
 * handshake+auth, bypassing Prisma's driver adapter (which only reports a generic
 * "pool timeout" without the underlying error). Used while debugging the Hostinger
 * production DB connectivity issue.
 *
 * Kept deliberately fast (a few seconds worst case) — a previous version chained
 * long sequential attempts and got killed by the hosting's reverse-proxy timeout
 * (503) before the Node app could even respond.
 *
 * Remove this route once resolved — it's unauthenticated.
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return Response.json({ ok: false, error: "DATABASE_URL não está definida" }, { status: 500 });
  }

  let host: string;
  let port: number;
  let user: string;
  let password: string;
  let database: string;
  try {
    const parsed = new URL(rawUrl);
    host = parsed.hostname;
    port = Number(parsed.port || 3306);
    user = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
    database = parsed.pathname.replace(/^\//, "");
  } catch {
    return Response.json({ ok: false, error: "DATABASE_URL inválida" }, { status: 500 });
  }

  function tcpTest() {
    return new Promise<{ ok: boolean; ms: number; error?: string }>((resolve) => {
      const start = Date.now();
      const socket = net.createConnection({ host, port, timeout: TIMEOUT_MS });
      socket.on("connect", () => {
        resolve({ ok: true, ms: Date.now() - start });
        socket.destroy();
      });
      socket.on("timeout", () => {
        resolve({ ok: false, ms: Date.now() - start, error: `timeout (sem resposta em ${TIMEOUT_MS}ms)` });
        socket.destroy();
      });
      socket.on("error", (err) => {
        resolve({ ok: false, ms: Date.now() - start, error: err.message });
      });
    });
  }

  async function tryHandshake(label: string, ssl: boolean) {
    const start = Date.now();
    try {
      const conn = await mariadb.createConnection({
        host,
        port,
        user,
        password,
        database,
        connectTimeout: TIMEOUT_MS,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
      });
      await conn.query("SELECT 1");
      await conn.end();
      return { label, ok: true, ms: Date.now() - start };
    } catch (err) {
      const e = err as { code?: string; errno?: number; message: string };
      return {
        label,
        ok: false,
        ms: Date.now() - start,
        code: e.code,
        errno: e.errno,
        error: e.message,
      };
    }
  }

  // TCP test and the first handshake attempt run in parallel (not chained) to
  // keep worst-case latency low; the SSL retry only runs if the plain one failed.
  const [tcp, withoutSsl] = await Promise.all([tcpTest(), tryHandshake("sem SSL", false)]);
  const withSsl = withoutSsl.ok ? null : await tryHandshake("com SSL", true);

  return Response.json({
    host,
    port,
    database,
    user,
    tcp,
    handshake: withSsl ?? withoutSsl,
    handshakeAttempts: withSsl ? [withoutSsl, withSsl] : [withoutSsl],
  });
}
