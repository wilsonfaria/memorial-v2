// Command-line version of the admin "Indexar busca" button (local/dev use —
// the production image has no tsx; use the admin button there).
//
//   npx tsx scripts/reindex-search.ts            # editions without text yet
//   npx tsx scripts/reindex-search.ts --all      # re-extract every PDF
//   npx tsx scripts/reindex-search.ts --sync     # resend DB text to Meilisearch
//   npx tsx scripts/reindex-search.ts --limit=20 # stop after N editions (testing)
import "dotenv/config";
import { reindexBatch, type ReindexMode } from "../src/lib/search/indexer";
import { prisma } from "../src/lib/prisma";

const mode: ReindexMode = process.argv.includes("--all") ? "all" : process.argv.includes("--sync") ? "sync" : "missing";
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const BATCH = mode === "sync" ? 100 : 10;

async function main() {
  const started = Date.now();
  let cursor = 0;
  let done = 0;
  const failed: { id: number; error: string }[] = [];
  for (;;) {
    const r = await reindexBatch(mode, cursor, Math.min(BATCH, limit - done));
    done += r.processed;
    failed.push(...r.failed);
    console.log(`[${mode}] ${done} processadas · restam ${r.remaining}${r.failed.length ? ` · ${r.failed.length} falha(s) no lote` : ""}`);
    if (r.nextCursor == null || done >= limit) break;
    cursor = r.nextCursor;
  }
  console.log(`Concluído em ${Math.round((Date.now() - started) / 1000)}s · ${failed.length} falha(s)`);
  for (const f of failed) console.log(`  edição ${f.id}: ${f.error}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
