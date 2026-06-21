import assert from "node:assert/strict";
import test from "node:test";
import { resolveCta } from "./minisite-cta.ts";

test("CALL builds tel href", () => {
  assert.deepEqual(resolveCta("CALL", { phone: "555-1234" }), { type: "CALL", label: "Call now", href: "tel:555-1234", external: false });
});

test("REVIEW uses review url and custom label", () => {
  const r = resolveCta("REVIEW", { reviewUrl: "https://g.page/review", label: "Review us" });
  assert.equal(r?.href, "https://g.page/review");
  assert.equal(r?.label, "Review us");
  assert.equal(r?.external, true);
});

test("returns null when destination missing", () => {
  assert.equal(resolveCta("WEBSITE", { websiteUrl: null }), null);
  assert.equal(resolveCta(null, {}), null);
});

test("DIRECTIONS and BOOK", () => {
  assert.equal(resolveCta("DIRECTIONS", { mapsUrl: "https://maps" })?.label, "Get directions");
  assert.equal(resolveCta("BOOK", { bookingUrl: "https://book" })?.href, "https://book");
});
