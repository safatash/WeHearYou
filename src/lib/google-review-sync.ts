import { ReviewStatus } from "@prisma/client";

export type ExistingGoogleReviewSnapshot = {
  reviewerName: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export type IncomingGoogleReviewSnapshot = {
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export function hasGoogleReviewChanged(existingReview: ExistingGoogleReviewSnapshot, incomingReview: IncomingGoogleReviewSnapshot) {
  return (
    existingReview.reviewerName !== incomingReview.reviewerName ||
    existingReview.rating !== incomingReview.rating ||
    existingReview.body !== incomingReview.body ||
    existingReview.status !== ReviewStatus.PUBLISHED ||
    (existingReview.reviewedAt?.toISOString() ?? null) !== (incomingReview.reviewedAt?.toISOString() ?? null) ||
    (existingReview.sourceUpdatedAt?.toISOString() ?? null) !== (incomingReview.sourceUpdatedAt?.toISOString() ?? null)
  );
}
