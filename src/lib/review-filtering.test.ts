import assert from "node:assert/strict";
import test from "node:test";
import { filterLocationReviews, sortFeaturedFirst, reviewNeedsReply } from "./review-filtering.ts";

const make = (over: Partial<Parameters<typeof filterLocationReviews>[0][number]>) => ({
  rating: 5, source: "GOOGLE", isFeatured: false, isHiddenFromMiniSite: false,
  replyPublishedAt: null, replySentAt: null, ...over,
});

test("needs-reply selects reviews with no reply", () => {
  const reviews = [make({ replyPublishedAt: new Date() }), make({})];
  assert.equal(filterLocationReviews(reviews, "needs-reply").length, 1);
});

test("rating buckets", () => {
  const reviews = [make({ rating: 5 }), make({ rating: 4 }), make({ rating: 2 }), make({ rating: 1 })];
  assert.equal(filterLocationReviews(reviews, "5").length, 1);
  assert.equal(filterLocationReviews(reviews, "4").length, 1);
  assert.equal(filterLocationReviews(reviews, "1-3").length, 2);
});

test("source filter is case-insensitive", () => {
  const reviews = [make({ source: "GOOGLE" }), make({ source: "YELP" })];
  assert.equal(filterLocationReviews(reviews, "google").length, 1);
  assert.equal(filterLocationReviews(reviews, "yelp").length, 1);
});

test("featured and hidden filters", () => {
  const reviews = [make({ isFeatured: true }), make({ isHiddenFromMiniSite: true }), make({})];
  assert.equal(filterLocationReviews(reviews, "featured").length, 1);
  assert.equal(filterLocationReviews(reviews, "hidden").length, 1);
  assert.equal(filterLocationReviews(reviews, "all").length, 3);
});

test("sortFeaturedFirst is stable and puts featured first", () => {
  const a = make({ isFeatured: false }); const b = make({ isFeatured: true }); const c = make({ isFeatured: false });
  const sorted = sortFeaturedFirst([a, b, c]);
  assert.deepEqual(sorted, [b, a, c]);
});

test("reviewNeedsReply", () => {
  assert.equal(reviewNeedsReply({ replyPublishedAt: null, replySentAt: null }), true);
  assert.equal(reviewNeedsReply({ replyPublishedAt: new Date(), replySentAt: null }), false);
});
