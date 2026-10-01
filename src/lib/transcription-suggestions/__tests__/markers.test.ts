import { test } from "node:test";
import assert from "node:assert/strict";
import { reflowText } from "@/lib/ocr-revision/reflow";
import { applyReading, findMarkers, locateMarker, seenBeforeMatches, validateReading } from "../markers";

const page = "### Festa\nO baile do [ilegível] foi animado.\nDepois o [ilegível] tocou até tarde; o [?] saiu.";

test("finds every [ilegível] in order, with its surroundings, ignoring [?]", () => {
  const markers = findMarkers(page);
  assert.equal(markers.length, 2);
  assert.deepEqual(
    markers.map((m) => m.occurrence),
    [0, 1]
  );
  assert.equal(page.slice(markers[0].start, markers[0].end), "[ilegível]");
  assert.equal(markers[0].before, "### Festa O baile do");
  // Context stops at the neighbouring marker.
  assert.equal(markers[0].after, "foi animado. Depois o");
  assert.equal(markers[1].before, "foi animado. Depois o");
  assert.ok(markers[1].after.startsWith("tocou até tarde"));
});

test("applying a reading replaces only that marker", () => {
  const [, second] = findMarkers(page);
  const out = applyReading(page, second, "maestro Silva");
  assert.match(out, /Depois o maestro Silva tocou/);
  assert.match(out, /baile do \[ilegível\] foi/);
});

test("locates the marker at the same position, or where it moved when an earlier one was fixed", () => {
  const [first, second] = findMarkers(page);
  const s = { occurrence: 1, contextBefore: second.before, contextAfter: second.after };
  assert.deepEqual(locateMarker(page, s), second);

  // The first gap was corrected meanwhile: the second is now occurrence 0.
  const fixed = applyReading(page, first, "Clube");
  const moved = locateMarker(fixed, s);
  assert.ok(moved);
  assert.equal(moved.occurrence, 0);
  assert.match(applyReading(fixed, moved, "maestro"), /Depois o maestro tocou/);
});

test("won't guess when the text around the marker changed", () => {
  const [, second] = findMarkers(page);
  const s = { occurrence: 1, contextBefore: second.before, contextAfter: second.after };
  assert.equal(locateMarker(page.replace("tocou até tarde", "dançou"), s), null);
  assert.equal(locateMarker("", s), null);
  // Two identical surroundings: ambiguous, so no.
  const twice = "y [ilegível] y [ilegível] y";
  const [m, m2] = findMarkers(twice);
  assert.deepEqual([m.before, m.after], [m2.before, m2.after]);
  assert.equal(locateMarker(twice, { occurrence: 5, contextBefore: m.before, contextAfter: m.after }), null);
});

test("what the reader saw (reflowed) matches the stored context", () => {
  const raw = "O abasteci-\nmento da cidade [ilegível] continua.";
  const [m] = findMarkers(raw);
  const shown = reflowText(raw);
  const seen = shown.slice(0, shown.indexOf("[ilegível]")).slice(-30);
  assert.equal(seen.includes("abastecimento"), true);
  assert.ok(seenBeforeMatches(m.before, seen));
  assert.ok(!seenBeforeMatches(m.before, "outra coisa"));
});

test("readings are one clean line of words", () => {
  assert.deepEqual(validateReading("  Clube   Recreativo\n"), { reading: "Clube Recreativo" });
  assert.ok("error" in validateReading("   "));
  assert.ok("error" in validateReading("[ilegível]"));
  assert.ok("error" in validateReading("### Título"));
  assert.ok("error" in validateReading("x".repeat(201)));
});
