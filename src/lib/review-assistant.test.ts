import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReviewAssistantPrompt,
  normalizeTone,
  normalizeLength,
  LENGTH_WORDS,
  type AssistantContext,
} from "./review-assistant.ts";
import { buildSuggestedChips, resolveChipCategory, CATEGORY_CHIPS, extractReviewThemes } from "./review-assistant-chips.ts";
import { summarizeAssistantEvents } from "./review-assistant-analytics.ts";

const baseCtx = (over: Partial<AssistantContext> = {}): AssistantContext => ({
  businessName: "Perfect Sonrisa Dental",
  city: "Fairfax",
  service: "Dental Cleaning",
  selectedPhrases: ["Friendly Staff", "Clean Office"],
  tone: "friendly",
  length: "medium",
  ...over,
});

// ── prompt ────────────────────────────────────────────────────────────────
test("prompt includes selected phrases and the length band", () => {
  const p = buildReviewAssistantPrompt(baseCtx());
  assert.match(p, /Friendly Staff, Clean Office/);
  assert.match(p, /between 80 and 120 words/);
  assert.match(p, /Tone: friendly/);
});

test("prompt mentions business name when includeBusiness is on", () => {
  const p = buildReviewAssistantPrompt(baseCtx({ includeBusiness: true }));
  assert.match(p, /Perfect Sonrisa Dental/);
});

test("prompt suppresses city when includeCity is off", () => {
  const p = buildReviewAssistantPrompt(baseCtx({ includeCity: false }));
  assert.match(p, /Do not mention the city/);
  assert.doesNotMatch(p, /You may mention the city/);
});

test("prompt references the service only when includeService is on", () => {
  assert.match(buildReviewAssistantPrompt(baseCtx({ includeService: true })), /Dental Cleaning/);
  const off = buildReviewAssistantPrompt(baseCtx({ includeService: false }));
  assert.doesNotMatch(off, /Refer to the service/);
});

test("prompt always forbids fabrication and guarantees", () => {
  const p = buildReviewAssistantPrompt(baseCtx());
  assert.match(p, /fabricate/i);
  assert.match(p, /medical, legal, or financial/i);
});

test("length bands are correct", () => {
  assert.deepEqual(LENGTH_WORDS.short, [40, 60]);
  assert.deepEqual(LENGTH_WORDS.medium, [80, 120]);
  assert.deepEqual(LENGTH_WORDS.detailed, [120, 180]);
});

test("normalizeTone / normalizeLength fall back to defaults", () => {
  assert.equal(normalizeTone("casual"), "casual");
  assert.equal(normalizeTone("bogus"), "friendly");
  assert.equal(normalizeLength("detailed"), "detailed");
  assert.equal(normalizeLength(null), "medium");
});

// ── chips ─────────────────────────────────────────────────────────────────
test("resolveChipCategory maps business types", () => {
  assert.equal(resolveChipCategory("Dental Practice"), "dental");
  assert.equal(resolveChipCategory("Personal Injury Law Firm"), "law");
  assert.equal(resolveChipCategory("Italian Restaurant"), "restaurant");
  assert.equal(resolveChipCategory("HVAC & Plumbing"), "home_services");
  assert.equal(resolveChipCategory("Something Else"), "default");
  assert.equal(resolveChipCategory(null), "default");
});

test("buildSuggestedChips prioritizes themes, dedupes case-insensitively", () => {
  const chips = buildSuggestedChips({
    businessType: "dental",
    reviewHighlights: ["Gentle Care"],
    services: ["Whitening"],
    customChips: ["friendly staff"], // dupe of category "Friendly Staff"
    useReviewThemes: true,
  });
  assert.equal(chips[0], "Gentle Care"); // theme first
  assert.ok(chips.includes("Whitening"));
  // case-insensitive dedupe keeps the first occurrence only
  const friendlyCount = chips.filter((c) => c.toLowerCase() === "friendly staff").length;
  assert.equal(friendlyCount, 1);
});

test("buildSuggestedChips can skip review themes", () => {
  const chips = buildSuggestedChips({ businessType: "restaurant", reviewThemes: ["X"], reviewHighlights: ["Y"], useReviewThemes: false });
  assert.ok(!chips.includes("X"));
  assert.ok(!chips.includes("Y"));
  assert.deepEqual(chips.slice(0, 2), CATEGORY_CHIPS.restaurant.slice(0, 2));
});

test("buildSuggestedChips puts review themes ahead of highlights and category", () => {
  const chips = buildSuggestedChips({
    businessType: "dental",
    reviewThemes: ["Real Results"],
    reviewHighlights: ["Gentle Care"],
    useReviewThemes: true,
  });
  assert.equal(chips[0], "Real Results");
  assert.equal(chips[1], "Gentle Care");
});

// ── review-theme extraction (the agency fix) ────────────────────────────────
test("extractReviewThemes derives themes from real review text, most-mentioned first", () => {
  const reviews = [
    { rating: 5, body: "They improved our SEO and our Google rankings shot up. More traffic and leads!" },
    { rating: 5, body: "Our search rankings improved a lot — great SEO work and very professional." },
    { rating: 4, body: "Beautiful website redesign and the team was professional throughout." },
  ];
  const themes = extractReviewThemes(reviews, { limit: 5 });
  assert.ok(themes.includes("Improved SEO & Rankings"));
  assert.ok(themes.includes("Professional Team"));
  assert.ok(themes.includes("Great Website Design"));
  // "Improved SEO & Rankings" appears in 2 reviews → ranks before single-mention themes
  assert.ok(themes.indexOf("Improved SEO & Rankings") < themes.indexOf("Great Website Design"));
});

test("extractReviewThemes ignores low-rated and empty reviews", () => {
  const themes = extractReviewThemes(
    [
      { rating: 2, body: "Terrible communication and unprofessional." },
      { rating: 5, body: "" },
      { rating: null, body: "Very professional team." },
    ],
    { minRating: 4 },
  );
  // the 2-star "communication"/"unprofessional" review is excluded
  assert.ok(!themes.includes("Great Communication"));
  assert.deepEqual(themes, ["Professional Team"]);
});

test("extractReviewThemes returns empty when nothing matches", () => {
  assert.deepEqual(extractReviewThemes([{ rating: 5, body: "asdf qwer zxcv" }]), []);
});

// ── analytics ───────────────────────────────────────────────────────────────
test("summarizeAssistantEvents computes counts and rates", () => {
  const a = summarizeAssistantEvents({
    requestsSent: 100,
    counts: {
      AI_ASSIST_VIEWED: 40,
      AI_ASSIST_GENERATED: 30,
      AI_ASSIST_COPIED: 25,
      AI_ASSIST_DEST_GOOGLE: 10,
      AI_ASSIST_DEST_YELP: 2,
      AI_ASSIST_WEHEARYOU_SUBMITTED: 4,
      FEEDBACK_SUBMITTED: 6,
    },
  });
  assert.equal(a.requestsSent, 100);
  assert.equal(a.reviewsStarted, 40);
  assert.equal(a.aiGenerated, 30);
  assert.equal(a.reviewsCopied, 25);
  assert.equal(a.googleClicks, 10);
  assert.equal(a.destinationClicks, 12);
  assert.equal(a.wehearyouSubmitted, 4);
  assert.equal(a.privateFeedback, 6);
  assert.equal(a.googleClickRate, 0.25);
  assert.equal(a.destinationClickRate, 0.3);
  assert.equal(a.completionRate, (12 + 4) / 40);
});

test("summarizeAssistantEvents avoids divide-by-zero", () => {
  const a = summarizeAssistantEvents({ requestsSent: 0, counts: {} });
  assert.equal(a.googleClickRate, 0);
  assert.equal(a.completionRate, 0);
});

// ── editMode / transform ─────────────────────────────────────────────────────
const editBaseCtx = {
  businessName: "NOVA Advertising", selectedPhrases: ["Great Communication"],
  tone: "friendly" as const, length: "detailed" as const,
};

test("transform prompt uses the existing draft, not from-scratch", () => {
  const p = buildReviewAssistantPrompt({ ...editBaseCtx, editMode: "shorter", existingDraft: "They were fantastic and thorough and kind." });
  assert.ok(p.includes("They were fantastic and thorough and kind."));
  assert.match(p.toLowerCase(), /shorter/);
  assert.match(p.toLowerCase(), /preserv|keep|meaning|voice/);
});
test("no editMode keeps from-scratch prompt (no draft echoed)", () => {
  const p = buildReviewAssistantPrompt(editBaseCtx);
  assert.ok(!p.includes("existing review"));
});
test("editMode without a draft falls back to from-scratch", () => {
  const p = buildReviewAssistantPrompt({ ...editBaseCtx, editMode: "shorter", existingDraft: "" });
  assert.ok(!p.includes("current review draft"));
});
