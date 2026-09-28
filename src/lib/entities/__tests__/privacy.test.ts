import { test } from "node:test";
import assert from "node:assert/strict";
import { MASK, nameMasker } from "../mask";
import { ARTICLE_KINDS, PRIVATE_KINDS, isPrivateKind, publicMentions } from "../kinds";

test("masks a hidden name in any case, accents and old/new spelling", () => {
  const mask = nameMasker(["José Motta"]);
  assert.equal(mask("Casamento de José Motta com Ana"), `Casamento de ${MASK} com Ana`);
  assert.equal(mask("CASAMENTO DE JOSÉ MOTTA"), `CASAMENTO DE ${MASK}`);
  assert.equal(mask("Jose Mota viajou para Piumhi."), `${MASK} viajou para Piumhi.`);
  assert.equal(mask("José  Motta e José Motta."), `${MASK} e ${MASK}.`);
  assert.equal(nameMasker(["Luiz Baptista"])("o sr. Luis Batista chegou"), `o sr. ${MASK} chegou`);
});

test("masks whole words only, longest name first", () => {
  const mask = nameMasker(["Ana", "José Motta Filho", "José Motta"]);
  assert.equal(mask("Mariana e Anápolis"), "Mariana e Anápolis");
  assert.equal(mask("Ana, de Anápolis"), `${MASK}, de Anápolis`);
  assert.equal(mask("José Motta Filho"), MASK);
});

test("escapes regex characters in names instead of breaking or matching too much", () => {
  const mask = nameMasker(["J. (Zé) Motta*", "a+b"]);
  assert.equal(mask("Visita de J. (Zé) Motta* hoje"), `Visita de ${MASK} hoje`);
  assert.equal(mask("JX (Zé) Motta hoje"), "JX (Zé) Motta hoje");
  assert.equal(mask("aab"), "aab");
});

test("with no hidden names the text is unchanged", () => {
  assert.equal(nameMasker([])("José Motta"), "José Motta");
  assert.equal(nameMasker(["  ", "Zé"])("José Motta, Zé"), "José Motta, Zé");
});

test("sensitive kinds are private and valid article kinds", () => {
  assert.deepEqual([...PRIVATE_KINDS].sort(), ["doenca", "policia", "politica", "religiao"]);
  for (const k of PRIVATE_KINDS) assert.ok((ARTICLE_KINDS as readonly string[]).includes(k));
  assert.ok(isPrivateKind("policia"));
  assert.ok(!isPrivateKind("casamento"));
});

test("the public timeline drops sensitive items", () => {
  const rows = ["casamento", "doenca", "obito", "policia", "religiao", "politica", "viagem"].map((kind, id) => ({
    id,
    article: { kind },
  }));
  assert.deepEqual(
    publicMentions(rows).map((r) => r.article.kind),
    ["casamento", "obito", "viagem"]
  );
});
