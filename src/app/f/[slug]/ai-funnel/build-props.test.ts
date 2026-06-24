// src/app/f/[slug]/ai-funnel/build-props.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildAiFunnelProps } from "./build-props.ts";

const baseLocation = {
  id: "loc1", name: "NOVA Advertising", city: "Fairfax", state: "VA",
  reviewLink: "https://g.page/r/abc/review", googlePlaceId: null,
  publicProfile: {
    negativeFilterThreshold: 4, highRatingMode: "SINGLE", highRatingDestinations: ["GOOGLE"],
    highRatingPrimaryDestination: null, facebookReviewUrl: null, customReviewUrl: null,
    logoUrl: null, aiAssistantCustomChips: [], reviewHighlights: ["Clear communication"],
    services: [], aiAssistantEnabled: true, aiAssistantAllowGeneration: true,
    aiAssistantAllowNotes: true, aiAssistantAllowTone: true, aiAssistantAllowLength: true,
    aiAssistantAllowRegenerate: true, aiAssistantIncludeService: true,
  },
};

test("derives business + threshold", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.equal(p.business.name, "NOVA Advertising");
  assert.equal(p.business.location, "Fairfax, VA");
  assert.equal(p.threshold, 4);
});
test("builds the google destination with its url, marked preferred", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.equal(p.destinations[0].id, "google");
  assert.equal(p.destinations[0].preferred, true);
  assert.equal(p.destinations[0].url, "https://g.page/r/abc/review");
});
test("seeds stoodOut with review highlights", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.ok(p.stoodOut.includes("Clear communication"));
});
test("turns AI off when generation disabled", () => {
  const loc = { ...baseLocation, publicProfile: { ...baseLocation.publicProfile, aiAssistantAllowGeneration: false } };
  assert.equal(buildAiFunnelProps(loc, { slug: "nova", embed: false }).ai.reviewEnabled, false);
});
