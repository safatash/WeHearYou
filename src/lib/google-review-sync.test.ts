import assert from "node:assert/strict";
import test from "node:test";
import { ReviewStatus } from "@prisma/client";
import { hasGoogleReviewChanged } from "./google-review-sync";

const baseExistingReview = {
  reviewerName: "Jane Doe",
  rating: 5,
  body: "Great service",
  status: ReviewStatus.PUBLISHED,
  reviewedAt: new Date("2026-04-01T12:00:00.000Z"),
  sourceUpdatedAt: new Date("2026-04-01T12:00:00.000Z"),
};

test("hasGoogleReviewChanged returns false when review fields are unchanged", () => {
  assert.equal(
    hasGoogleReviewChanged(baseExistingReview, {
      reviewerName: "Jane Doe",
      rating: 5,
      body: "Great service",
      reviewedAt: new Date("2026-04-01T12:00:00.000Z"),
      sourceUpdatedAt: new Date("2026-04-01T12:00:00.000Z"),
    }),
    false,
  );
});

test("hasGoogleReviewChanged returns true when review content changes", () => {
  assert.equal(
    hasGoogleReviewChanged(baseExistingReview, {
      reviewerName: "Jane Doe",
      rating: 5,
      body: "Great service and support",
      reviewedAt: new Date("2026-04-01T12:00:00.000Z"),
      sourceUpdatedAt: new Date("2026-04-01T12:00:00.000Z"),
    }),
    true,
  );
});

test("hasGoogleReviewChanged returns true when status is no longer published", () => {
  assert.equal(
    hasGoogleReviewChanged(
      {
        ...baseExistingReview,
        status: ReviewStatus.NEEDS_FOLLOW_UP,
      },
      {
        reviewerName: "Jane Doe",
        rating: 5,
        body: "Great service",
        reviewedAt: new Date("2026-04-01T12:00:00.000Z"),
        sourceUpdatedAt: new Date("2026-04-01T12:00:00.000Z"),
      },
    ),
    true,
  );
});

test("hasGoogleReviewChanged returns true when source update timestamp changes", () => {
  assert.equal(
    hasGoogleReviewChanged(baseExistingReview, {
      reviewerName: "Jane Doe",
      rating: 5,
      body: "Great service",
      reviewedAt: new Date("2026-04-01T12:00:00.000Z"),
      sourceUpdatedAt: new Date("2026-04-02T12:00:00.000Z"),
    }),
    true,
  );
});
