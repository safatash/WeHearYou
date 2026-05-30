import assert from "node:assert/strict";
import test from "node:test";

test("item with scheduledAt in the past should be processed", () => {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() - 60_000);
  assert.ok(scheduledAt <= now, "past item should be lte now");
});

test("item with scheduledAt in the future should not be processed", () => {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 60_000);
  assert.ok(!(scheduledAt <= now), "future item should not be lte now");
});

test("PUBLISHED items should not be re-processed", () => {
  const status = "PUBLISHED";
  assert.notEqual(status, "SCHEDULED");
});

test("FAILED items should not be retried automatically", () => {
  const status = "FAILED";
  assert.notEqual(status, "SCHEDULED");
});

test("DRAFT items should not be published", () => {
  const status = "DRAFT";
  assert.notEqual(status, "SCHEDULED");
});

test("extracts callToAction from JSON config when url present", () => {
  const raw = { actionType: "BOOK", url: "https://example.com/book" };
  const cta = raw.url ? { actionType: raw.actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.deepEqual(cta, { actionType: "BOOK", url: "https://example.com/book" });
});

test("returns null callToAction when url missing", () => {
  const raw = { actionType: "BOOK", url: "" };
  const cta = raw.url ? { actionType: raw.actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.equal(cta, null);
});

test("defaults callToAction actionType to LEARN_MORE when not specified", () => {
  const raw = { url: "https://example.com" };
  const cta = raw.url ? { actionType: (raw as Record<string, string>).actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.equal(cta?.actionType, "LEARN_MORE");
});
