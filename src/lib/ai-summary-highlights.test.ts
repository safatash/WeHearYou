import assert from "node:assert/strict";
import test from "node:test";
import { parseHighlights } from "./ai-summary.ts";

test("parses newline list with bullets", () => {
  assert.deepEqual(parseHighlights("- Friendly staff\n- Fast service\n* Clean office"), ["Friendly staff", "Fast service", "Clean office"]);
});

test("parses comma list and caps at 5", () => {
  assert.deepEqual(parseHighlights("a, b, c, d, e, f"), ["a", "b", "c", "d", "e"]);
});

test("dedupes and drops empties", () => {
  assert.deepEqual(parseHighlights("Friendly, friendly, , Fast"), ["Friendly", "Fast"]);
});
