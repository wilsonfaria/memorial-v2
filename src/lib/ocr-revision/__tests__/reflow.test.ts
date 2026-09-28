import { test } from "node:test";
import assert from "node:assert/strict";
import { reflowText } from "../reflow";

test("joins a paragraph split across column lines, rejoining hyphenated words", () => {
  const input = "a snra d. Xando-\nca Alzamora, acompanhada de\nseus filhos.";
  assert.equal(reflowText(input), "a snra d. Xandoca Alzamora, acompanhada de seus filhos.");
});

test("keeps the break after a sentence ends", () => {
  assert.equal(reflowText("morreu o\nfoguista.\nO presidente, sua senhora e\numa filhinha"), "morreu o foguista.\nO presidente, sua senhora e uma filhinha");
});

test("an abbreviation does not end the sentence", () => {
  assert.equal(reflowText("o presidente provisorio dr.\nPortes Gil."), "o presidente provisorio dr. Portes Gil.");
});

test("keeps list items, headings and ALL-CAPS ad lines on their own lines", () => {
  const input = "FIZERAM ANNOS:\n— no dia 12, a sra. d. Noemia;\n— no dia 13, Trajano Lima;\n### NATALIDADE\nPRISÃO\nDE VENTRE";
  assert.equal(reflowText(input), input);
});

test("keeps blank lines between paragraphs", () => {
  assert.equal(reflowText("primeiro paragrapho.\n\nsegundo\nparagrapho."), "primeiro paragrapho.\n\nsegundo paragrapho.");
});

test("is idempotent", () => {
  const input = "NO MEXICO foi dynamita-\ndo um trem em que via-\njava o presidente.\nDois vagões e a locomotiva\nficaram destruidos.";
  assert.equal(reflowText(reflowText(input)), reflowText(input));
});
