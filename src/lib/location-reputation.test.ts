import assert from "node:assert/strict";
import test from "node:test";
import { buildLocationReputation, hueFromId, type ReputationReview, type ReputationLocationInput } from "./location-reputation.ts";

const NOW = new Date("2026-06-22T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function review(overrides: Partial<ReputationReview> = {}): ReputationReview {
  return {
    rating: 5,
    source: "GOOGLE",
    reviewedAt: daysAgo(1),
    createdAt: daysAgo(1),
    replyPublishedAt: null,
    replySentAt: null,
    ...overrides,
  };
}

function location(overrides: Partial<ReputationLocationInput> = {}): ReputationLocationInput {
  return {
    id: "loc_1",
    avgRating: null,
    googleConnectionId: null,
    googleConnectedAt: null,
    yelpConnectedAt: null,
    lastSyncStatus: null,
    reviews: [],
    ...overrides,
  };
}

test("rating falls back to mean of reviews when avgRating is absent", () => {
  const rep = buildLocationReputation(location({ reviews: [review({ rating: 4 }), review({ rating: 5 })] }), NOW);
  assert.equal(rep.rating, 4.5);
});

test("avgRating takes precedence over computed mean", () => {
  const rep = buildLocationReputation(location({ avgRating: 4.2, reviews: [review({ rating: 1 })] }), NOW);
  assert.equal(rep.rating, 4.2);
});

test("rating is null with no rated reviews and no avgRating", () => {
  const rep = buildLocationReputation(location({ reviews: [review({ rating: null })] }), NOW);
  assert.equal(rep.rating, null);
});

test("ratingDelta compares last 30 days to the prior 30 days", () => {
  const rep = buildLocationReputation(
    location({
      reviews: [
        review({ rating: 5, reviewedAt: daysAgo(5), createdAt: daysAgo(5) }),
        review({ rating: 3, reviewedAt: daysAgo(40), createdAt: daysAgo(40) }),
      ],
    }),
    NOW,
  );
  assert.equal(rep.ratingDelta, 2);
});

test("ratingDelta is null when a window is empty", () => {
  const rep = buildLocationReputation(
    location({ reviews: [review({ rating: 5, reviewedAt: daysAgo(2), createdAt: daysAgo(2) })] }),
    NOW,
  );
  assert.equal(rep.ratingDelta, null);
});

test("spark is empty with fewer than three rated reviews", () => {
  const rep = buildLocationReputation(location({ reviews: [review(), review()] }), NOW);
  assert.deepEqual(rep.spark, []);
});

test("spark returns cumulative-average points when enough reviews exist", () => {
  const reviews = [
    review({ rating: 3, reviewedAt: daysAgo(9), createdAt: daysAgo(9) }),
    review({ rating: 4, reviewedAt: daysAgo(6), createdAt: daysAgo(6) }),
    review({ rating: 5, reviewedAt: daysAgo(3), createdAt: daysAgo(3) }),
  ];
  const rep = buildLocationReputation(location({ reviews }), NOW);
  assert.deepEqual(rep.spark, [3, 3.5, 4]);
});

test("responseRate and pending reflect reply state", () => {
  const rep = buildLocationReputation(
    location({
      reviews: [
        review({ replyPublishedAt: daysAgo(1) }),
        review({ replySentAt: daysAgo(1) }),
        review({}),
        review({}),
      ],
    }),
    NOW,
  );
  assert.equal(rep.responseRate, 50);
  assert.equal(rep.pending, 2);
});

test("responseRate is null with no reviews", () => {
  const rep = buildLocationReputation(location({ reviews: [] }), NOW);
  assert.equal(rep.responseRate, null);
  assert.equal(rep.pending, 0);
});

test("newThisMonth counts reviews inside the 30-day window", () => {
  const rep = buildLocationReputation(
    location({
      reviews: [review({ reviewedAt: daysAgo(2), createdAt: daysAgo(2) }), review({ reviewedAt: daysAgo(45), createdAt: daysAgo(45) })],
    }),
    NOW,
  );
  assert.equal(rep.newThisMonth, 1);
});

test("sources combine review sources with connected integrations, in canonical order", () => {
  const rep = buildLocationReputation(
    location({ yelpConnectedAt: daysAgo(10), reviews: [review({ source: "INTERNAL" }), review({ source: "GOOGLE" })] }),
    NOW,
  );
  assert.deepEqual(rep.sources, ["GOOGLE", "YELP", "INTERNAL"]);
});

test("gbpConnected is true when a google connection exists", () => {
  assert.equal(buildLocationReputation(location({ googleConnectionId: "gc_1" }), NOW).gbpConnected, true);
  assert.equal(buildLocationReputation(location({ googleConnectedAt: daysAgo(1) }), NOW).gbpConnected, true);
  assert.equal(buildLocationReputation(location(), NOW).gbpConnected, false);
});

test("health is attention on sync error", () => {
  assert.equal(buildLocationReputation(location({ lastSyncStatus: "error" }), NOW).health, "attention");
});

test("health is attention on malformed google mapping", () => {
  assert.equal(buildLocationReputation(location({ googleMappingHealth: { status: "malformed" } }), NOW).health, "attention");
});

test("health is attention when too many replies are pending", () => {
  const reviews = Array.from({ length: 5 }, () => review());
  assert.equal(buildLocationReputation(location({ reviews }), NOW).health, "attention");
});

test("health is attention when rating is below four", () => {
  assert.equal(buildLocationReputation(location({ avgRating: 3.5 }), NOW).health, "attention");
});

test("health is attention when response rate is below 75 percent", () => {
  const reviews = [review({ replyPublishedAt: daysAgo(1) }), review({}), review({})];
  // avgRating high so only response rate triggers attention
  assert.equal(buildLocationReputation(location({ avgRating: 4.8, reviews }), NOW).health, "attention");
});

test("health is healthy when everything is within thresholds", () => {
  const reviews = [review({ replyPublishedAt: daysAgo(1) }), review({ replySentAt: daysAgo(1) })];
  assert.equal(buildLocationReputation(location({ avgRating: 4.7, reviews }), NOW).health, "healthy");
});

test("hueFromId is deterministic and within range", () => {
  assert.equal(hueFromId("loc_1"), hueFromId("loc_1"));
  const hue = hueFromId("some-other-id");
  assert.ok(hue >= 0 && hue < 360);
});
