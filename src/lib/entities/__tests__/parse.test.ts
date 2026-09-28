import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExtraction } from "../extract";

const item = { titulo: "NATALIDADE", tipo: "nascimento", resumo: "Nasceu uma menina.", pessoas: [{ nome: "snra. d. Dolorita Martins", tratamento: "", papel: "mãe" }], lugares: ["Piumhy", "d."] };

test("accepts the requested object and a bare array", () => {
  assert.equal(parseExtraction({ materias: [item] }).length, 1);
  assert.equal(parseExtraction([item]).length, 1);
  assert.throws(() => parseExtraction({ outra: [] }));
});

test("cleans each item: honorific split from the name, unknown type → outro, junk places dropped", () => {
  const [a] = parseExtraction([{ ...item, tipo: "fofoca" }]);
  assert.equal(a.kind, "outro");
  assert.deepEqual(a.people, [{ surface: "Dolorita Martins", honorific: "snra. d.", role: "mãe" }]);
  assert.deepEqual(a.places, ["Piumhy"]);
});
