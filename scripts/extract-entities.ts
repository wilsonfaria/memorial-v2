// Extracts articles/people/places from transcribed pages that don't have them yet.
//   npx tsx scripts/extract-entities.ts            # all pending
//   npx tsx scripts/extract-entities.ts --limit=5  # stop after N pages
import "dotenv/config";
import { extractNextPage } from "../src/lib/entities/extract";

const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);

async function main() {
  for (let n = 0; n < limit; n++) {
    const r = await extractNextPage();
    if (r.status === "done") return console.log("Nada pendente.");
    if (r.status === "quota") return console.log("Cota diária esgotada — continue amanhã.");
    if (r.status === "busy") return console.log("Google sobrecarregado — tente de novo em alguns minutos.");
    if (r.status === "failed") console.log(`✗ ${r.editionId}/${r.page}: ${r.error}`);
    else console.log(`✓ ${r.editionId}/${r.page}: ${r.result.articles} matérias, ${r.result.people} pessoas, ${r.result.places} lugares (${r.result.model}) · faltam ${r.remaining}`);
  }
}
main().then(() => process.exit(0));
