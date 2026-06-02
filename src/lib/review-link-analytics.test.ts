import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAttribution } from "./review-link-analytics";

test("sanitizeAttribution — known source passes through", () => {
  const result = sanitizeAttribution({ src: "email_signature" });
  assert.equal(result.source, "email_signature");
});

test("sanitizeAttribution — unknown source becomes null", () => {
  const result = sanitizeAttribution({ src: "malicious_payload" });
  assert.equal(result.source, null);
});

test("sanitizeAttribution — unknown medium becomes null", () => {
  const result = sanitizeAttribution({ medium: "carrier_pigeon" });
  assert.equal(result.medium, null);
});

test("sanitizeAttribution — invalid sessionId becomes null", () => {
  const result = sanitizeAttribution({ sessionId: "not-a-uuid" });
  assert.equal(result.sessionId, null);
});

test("sanitizeAttribution — valid UUID v4 sessionId passes through", () => {
  const v4 = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const result = sanitizeAttribution({ sessionId: v4 });
  assert.equal(result.sessionId, v4);
});

test("sanitizeAttribution — referrer strips query string", () => {
  const result = sanitizeAttribution({
    referrer: "https://example.com/page?secret=12345&other=value",
  });
  assert.equal(result.referrer, "https://example.com/page");
});

test("sanitizeAttribution — malformed referrer becomes null", () => {
  const result = sanitizeAttribution({ referrer: "not a url at all" });
  assert.equal(result.referrer, null);
});

test("sanitizeAttribution — referrer truncated to 500 chars", () => {
  const longPath = "/" + "a".repeat(600);
  const result = sanitizeAttribution({
    referrer: `https://example.com${longPath}`,
  });
  assert.ok(result.referrer !== null);
  assert.ok((result.referrer?.length ?? 0) <= 500);
});

test("sanitizeAttribution — null src gives null source", () => {
  const result = sanitizeAttribution({ src: null });
  assert.equal(result.source, null);
});

test("sanitizeAttribution — valid placement passes through", () => {
  const result = sanitizeAttribution({ placement: "happy_card" });
  assert.equal(result.placement, "happy_card");
});

test("sanitizeAttribution — invalid placement becomes null", () => {
  const result = sanitizeAttribution({ placement: "xss_injection" });
  assert.equal(result.placement, null);
});
