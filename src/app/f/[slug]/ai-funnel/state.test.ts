// src/app/f/[slug]/ai-funnel/state.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { nextFromRating, contactSummary, INITIAL_STATE, shouldAutoGenerate } from "./state.ts";

test("rating at/above threshold routes positive", () => assert.equal(nextFromRating(4, 4), "pos-intro"));
test("rating below threshold routes negative", () => assert.equal(nextFromRating(2, 4), "neg-intro"));
test("contactSummary empty when no contact", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "" }), ""));
test("contactSummary empty when contact is no", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "no" }), ""));
test("contactSummary formats email", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "email", contactValue: "a@b.co" }), "email:a@b.co"));

test("auto-generates on first AI arrival", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: false, writingMode: "ai" }), true);
});
test("does not auto-generate once a draft exists", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: true, writingMode: "ai" }), false);
});
test("does not auto-generate in manual mode", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: false, writingMode: "manual" }), false);
});
test("INITIAL_STATE defaults: ai mode, not generated, detailed", () => {
  assert.equal(INITIAL_STATE.writingMode, "ai");
  assert.equal(INITIAL_STATE.draftGenerated, false);
  assert.equal(INITIAL_STATE.selectedVersion, "detailed");
});
