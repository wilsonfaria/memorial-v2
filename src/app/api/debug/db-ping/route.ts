import net from "node:net";

export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic route: raw TCP connect test to the configured DB host,
 * bypassing Prisma/the driver adapter entirely. Used to tell apart a network
 * reachability problem (firewall/routing) from a Prisma/driver-level issue.
 *
 * Remove this route once the production DB connectivity issue is resolved —
 * it's unauthenticated and not meant to stay in the deployed app long-term.
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return Response.json({ ok: false, error: "DATABASE_URL não está definida" }, { status: 500 });
  }

  let host: string;
  let port: number;
  try {
    const parsed = new URL(rawUrl);
    host = parsed.hostname;
    port = Number(parsed.port || 3306);
  } catch {
    return Response.json({ ok: false, error: "DATABASE_URL inválida" }, { status: 500 });
  }

  const result = await new Promise<{ ok: boolean; host: string; port: number; ms: number; error?: string }>(
    (resolve) => {
      const start = Date.now();
      const socket = net.createConnection({ host, port, timeout: 8000 });

      socket.on("connect", () => {
        resolve({ ok: true, host, port, ms: Date.now() - start });
        socket.destroy();
      });
      socket.on("timeout", () => {
        resolve({ ok: false, host, port, ms: Date.now() - start, error: "timeout (sem resposta em 8s)" });
        socket.destroy();
      });
      socket.on("error", (err) => {
        resolve({ ok: false, host, port, ms: Date.now() - start, error: err.message });
      });
    }
  );

  return Response.json(result);
}
