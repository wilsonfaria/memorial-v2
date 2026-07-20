import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
// Served as .js (not .mjs): some hosting front-ends/proxies don't have a
// MIME mapping for .mjs and serve it as text/plain, which browsers refuse
// to execute as a module script. .js is universally recognized.
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.js");

await copyFile(src, dest);
console.log("pdf.worker.min.js copiado para public/");
