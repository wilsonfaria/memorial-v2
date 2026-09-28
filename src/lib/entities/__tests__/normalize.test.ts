import { test } from "node:test";
import assert from "node:assert/strict";
import { displayName, entityKey, isUsableName, slugFromKey, splitHonorific } from "../normalize";

test("old and modern spellings of a place share a key", () => {
  assert.equal(entityKey("Piumhy"), entityKey("Piumhi"));
  assert.equal(entityKey("Bambuhy"), entityKey("Bambuí"));
  assert.equal(entityKey("Bello Horizonte"), entityKey("Belo Horizonte"));
});

test("old and modern spellings of a person share a key", () => {
  assert.equal(entityKey("José Motta"), entityKey("José Mota"));
  assert.equal(entityKey("João Baptista de Mello"), entityKey("João Batista de Melo"));
  assert.equal(entityKey("Victor Emmanuel"), entityKey("Vitor Emanuel"));
  assert.equal(entityKey("Luiz"), entityKey("Luís"));
});

test("honorifics are separated, not part of the key", () => {
  assert.deepEqual(splitHonorific("cap. José Motta"), { honorific: "cap.", name: "José Motta" });
  assert.deepEqual(splitHonorific("snra. d. Dolorita Martins"), { honorific: "snra. d.", name: "Dolorita Martins" });
  assert.equal(entityKey("dr. Atos Teixeira"), entityKey("Atos Teixeira"));
});

test("different names stay apart", () => {
  assert.notEqual(entityKey("José Motta"), entityKey("Motta"));
  assert.notEqual(entityKey("Maria Alzamora"), entityKey("Mario Alzamora"));
});

test("slugs and usable names", () => {
  assert.equal(slugFromKey(entityKey("José Motta Mourão")), "jose-mota-mourao");
  assert.equal(isUsableName("d."), false);
  assert.equal(isUsableName("Ary"), true);
});

test("places keep their 'S.' / 'Sta.' prefix", () => {
  assert.equal(entityKey("S. PAULO", "place"), "s paulo");
  assert.notEqual(entityKey("S. Paulo", "place"), entityKey("Paulo", "place"));
});

test("all-caps names are shown in title case", () => {
  assert.equal(displayName("OLIVEIRA JUNIOR"), "Oliveira Junior");
  assert.equal(displayName("RUA 13 DE MAIO"), "Rua 13 de Maio");
  assert.equal(displayName("Piumhy"), "Piumhy");
});
