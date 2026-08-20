import assert from "node:assert/strict";
import test from "node:test";
import {
  hasMetaReviewChanged,
  normalizeMetaRecommendation,
} from "./meta-review-sync.ts";

test("Meta numeric ratings stay numeric and derive a safe sentiment", () => {
  assert.deepEqual(normalizeMetaRecommendation(5, "negative"), {
    rating: 5,
    sentiment: "positive",
  });
  assert.deepEqual(normalizeMetaRecommendation(2, null), {
    rating: 2,
    sentiment: "negative",
  });
});

test("Meta recommendation-only records retain no fabricated star rating", () => {
  assert.deepEqual(normalizeMetaRecommendation(null, "positive"), {
    rating: null,
    sentiment: "positive",
  });
  assert.deepEqual(normalizeMetaRecommendation(undefined, "negative"), {
    rating: null,
    sentiment: "negative",
  });
  assert.deepEqual(normalizeMetaRecommendation(null, "unknown"), {
    rating: null,
    sentiment: "neutral",
  });
});

test("unchanged recommendation-only records do not repeatedly update on sync", () => {
  const snapshot = {
    reviewerName: "Facebook reviewer",
    rating: null,
    body: "No written review provided.",
    reviewedAt: null,
    sourceUpdatedAt: null,
  };

  assert.equal(hasMetaReviewChanged(snapshot, snapshot), false);
});
