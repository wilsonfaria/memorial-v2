import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cropAndMark,
  MARK_END,
  MARK_START,
  markTextItemHtml,
  queryTerms,
  snippetTerms,
  termRanges,
} from "../highlight";

const marked = (s: string) => `${MARK_START}${s}${MARK_END}`;

test("termRanges matches ignoring accents and case, in original positions", () => {
  const text = "A PRAÇA da Matriz e a praca nova";
  assert.deepEqual(termRanges(text, queryTerms("praça")), [
    [2, 7],
    [22, 27],
  ]);
  assert.deepEqual(termRanges("ﬁlho", ["filho"]), [[0, 4]]); // "ﬁ" ligature is one original char
});

test("cropAndMark still marks every term inside the crop", () => {
  const out = cropAndMark("O baile no Clube foi animado; o clube lotou.", "clube");
  assert.equal(out, `O baile no ${marked("Clube")} foi animado; o ${marked("clube")} lotou.`);
});

test("snippetTerms takes the words the engine marked, folded and deduplicated", () => {
  const snippet = `…a ${marked("Carnaval")} de 1954 e o ${marked("carnavál")} do ${marked("Rei Momo")}…`;
  assert.deepEqual(snippetTerms(snippet), ["carnaval", "rei", "momo"]);
  assert.deepEqual(snippetTerms("…as aguas do rio invadiram a cidade…"), []);
});

test("markTextItemHtml wraps matches in <mark> and escapes the PDF text", () => {
  assert.equal(markTextItemHtml("Festa do Rei Momo", ["momo"]), "Festa do Rei <mark>Momo</mark>");
  assert.equal(
    markTextItemHtml("<b>Praça</b> & praca", ["praca"]),
    "&lt;b&gt;<mark>Praça</mark>&lt;/b&gt; &amp; <mark>praca</mark>"
  );
  assert.equal(markTextItemHtml("sem nada", []), "sem nada");
  assert.equal(markTextItemHtml(`a "citação"`, ["zz"]), "a &quot;citação&quot;");
});

test("overlapping terms produce one mark, never nested", () => {
  assert.equal(markTextItemHtml("carnavalesco", ["carnaval", "carnavalesco"]), "<mark>carnavalesco</mark>");
});
