// Content seed for a server whose uploads live on a volume: copies the images
// committed under public/uploads/ (hero slides, banners, gallery, homepage
// photos, edition cover thumbnails — the ones the database points at) into
// the real uploads folder, UPLOADS_STORAGE_ROOT (e.g. /data/uploads in the
// Docker image). Same resolution rule as src/lib/uploads-root.ts.
//
// Only files that don't exist yet are copied, so running it on every start is
// safe: anything the admin has since replaced or added on the server is never
// overwritten. When UPLOADS_STORAGE_ROOT is unset (local dev) the source and
// target are the same folder and there's nothing to do.
// Run with `npm run seed:uploads` (start:prod and the Dockerfile run it too).
import { cp, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SOURCE = path.join(process.cwd(), "public", "uploads");
const TARGET = path.resolve(process.env.UPLOADS_STORAGE_ROOT ?? SOURCE);

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

if (TARGET === path.resolve(SOURCE)) {
  console.log("[seed-uploads] uploads are served from public/uploads itself — nothing to do.");
  process.exit(0);
}
if (!(await exists(SOURCE))) {
  console.log("[seed-uploads] public/uploads not found — nothing to do.");
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
