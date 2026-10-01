import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCaptionSuggestion, wrapIndex } from "../gallery-suggestions";

const ok = (s: string) => {
  const r = validateCaptionSuggestion(s);
  assert.ok("suggestion" in r, `expected "${s}" to be accepted, got ${JSON.stringify(r)}`);
  return r.suggestion;
};
const rejected = (s: string) => assert.ok("error" in validateCaptionSuggestion(s), `expected "${s}" to be rejected`);

test("real identifications pass, whitespace collapsed", () => {
  assert.equal(ok("  Meu avô  José Motta,\n à esquerda "), "Meu avô José Motta, à esquerda");
  ok("Desfile de 7 de setembro de 1954 na Praça da Matriz");
  ok("Turma de 1962 do Instituto João Machado");
});

test("phone numbers, links, bare digits and empty text are turned away", () => {
  // The junk found in the real queue — told why, not just "write more".
  assert.deepEqual(validateCaptionSuggestion("37999269478"), { error: "Não inclua telefones ou números de contato." });
  rejected("me liga (37) 99926-9478");
  rejected("veja www.exemplo.com");
  rejected("https://spam.example/x");
  rejected("12345");
  rejected("  a ");
  rejected("x".repeat(501));
});

test("slide index wraps at both ends", () => {
  assert.equal(wrapIndex(8, 8), 0);
  assert.equal(wrapIndex(-1, 8), 7);
  assert.equal(wrapIndex(3, 8), 3);
  assert.equal(wrapIndex(0, 0), 0);
});
