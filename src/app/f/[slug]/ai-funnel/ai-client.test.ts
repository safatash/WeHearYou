// src/app/f/[slug]/ai-funnel/ai-client.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mapToneAction, generateReview, clarifyFeedbackRemote } from "./ai-client.ts";

const cur = { tone: "friendly" as const, length: "medium" as const };
const base = { locationId:"l", rating:5, selectedPhrases:[], service:"", staffMember:"", notes:"", tone:"friendly" as const, length:"medium" as const, sessionId:null, isRegenerate:false };

test("mapToneAction shorter sets length short", () => assert.equal(mapToneAction("shorter", cur).length, "short"));
test("mapToneAction professional sets tone", () => assert.equal(mapToneAction("professional", cur).tone, "professional"));
test("mapToneAction regen flags regenerate, keeps tone/length", () => {
  const r = mapToneAction("regen", cur);
  assert.equal(r.tone, "friendly"); assert.equal(r.length, "medium"); assert.equal(r.isRegenerate, true);
});

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
