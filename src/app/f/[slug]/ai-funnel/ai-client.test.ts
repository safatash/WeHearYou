// src/app/f/[slug]/ai-funnel/ai-client.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { generateReview, clarifyFeedbackRemote, editModeForAction } from "./ai-client.ts";

const base = { locationId:"l", rating:5, selectedPhrases:[], service:"", staffMember:"", notes:"", tone:"friendly" as const, length:"medium" as const, sessionId:null, isRegenerate:false };

test("generateReview returns review on ok", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => ({ review: "Great!", sessionId: "s1" }) })) as unknown as typeof fetch;
  try {
    const r = await generateReview(base);
    assert.equal(r.review, "Great!"); assert.equal(r.sessionId, "s1"); assert.equal(r.usedFallback, false);
  } finally { globalThis.fetch = orig; }
});
test("generateReview flags fallback on 403", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false, status: 403, json: async () => ({ error: "x" }) })) as unknown as typeof fetch;
  try { assert.equal((await generateReview(base)).usedFallback, true); }
  finally { globalThis.fetch = orig; }
});
test("clarifyFeedbackRemote flags fallback on network error", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
  try { assert.equal((await clarifyFeedbackRemote("l","text",[])).usedFallback, true); }
  finally { globalThis.fetch = orig; }
});

test("editModeForAction returns the matching edit mode", () => {
  assert.equal(editModeForAction("shorter"), "shorter");
  assert.equal(editModeForAction("professional"), "professional");
});
test("generateReview forwards editMode + existingDraft in the request body", async () => {
  const orig = globalThis.fetch;
  let sentBody: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_url: string, init: { body: string }) => { sentBody = JSON.parse(init.body); return { ok: true, json: async () => ({ review: "Shorter.", sessionId: "s1" }) }; }) as unknown as typeof fetch;
  try {
    const r = await generateReview({ locationId: "l", rating: 5, selectedPhrases: [], service: "", staffMember: "", notes: "", tone: "friendly", length: "detailed", sessionId: "s1", isRegenerate: false, editMode: "shorter", existingDraft: "long text here" });
    assert.equal(sentBody!.editMode, "shorter");
    assert.equal(sentBody!.existingDraft, "long text here");
    assert.equal(r.review, "Shorter.");
  } finally { globalThis.fetch = orig; }
});
