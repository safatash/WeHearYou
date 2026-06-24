import test from "node:test";
import assert from "node:assert/strict";
import { buildReview, clarifyFeedback } from "./fallback-text.ts";

const biz = { name: "NOVA Advertising", location: "Fairfax, VA" };

test("buildReview names the business and is non-trivial", () => {
  const r = buildReview({ chips: ["Highly Recommend"], service: "Local SEO", helper: "", extra: "" }, biz, "detailed");
  assert.ok(r.includes("NOVA Advertising"));
  assert.ok(r.length > 40);
});
test("buildReview short variant is non-empty", () => {
  assert.ok(buildReview({ chips: [], service: "", helper: "", extra: "" }, biz, "short").length > 0);
});
test("clarifyFeedback tidies provided text and keeps meaning", () => {
  const r = clarifyFeedback("they were late and billing was wrong", ["Billing Concern"], biz);
  assert.ok(r.toLowerCase().includes("billing"));
});
test("clarifyFeedback handles empty text using issues", () => {
  assert.ok(clarifyFeedback("", ["Long Wait Time"], biz).includes("NOVA Advertising"));
});
