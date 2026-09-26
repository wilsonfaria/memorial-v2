// One-time content seed for a fresh server: copies the site images committed
// under seed/uploads/ (hero slides, banners, gallery, homepage photos — the
// ones the database dump points at) into the real uploads folder
// (UPLOADS_STORAGE_ROOT, or public/uploads when unset — same rule as
// src/lib/uploads-root.ts).
//
// Only files that don't exist yet are copied, so running it on every start is
// safe: anything the admin has since replaced or added on the server is never
// overwritten. Run with `npm run seed:uploads` (start:prod runs it too).
import { cp, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SOURCE = path.join(process.cwd(), "seed", "uploads");
const TARGET = process.env.UPLOADS_STORAGE_ROOT ?? path.join(process.cwd(), "public", "uploads");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  );
  return files.flat();
}

if (!(await exists(SOURCE))) {
  console.log("[seed-uploads] seed/uploads not found — nothing to do.");
  process.exit(0);
}

let copied = 0;
let skipped = 0;
for (const file of await walk(SOURCE)) {
  const dest = path.join(TARGET, path.relative(SOURCE, file));
  if (await exists(dest)) {
    skipped++;
    continue;
  }
  await cp(file, dest, { recursive: false, force: false, errorOnExist: false });
  copied++;
}
console.log(`[seed-uploads] ${copied} copied, ${skipped} already present → ${TARGET}`);
