export type ReviewSnapshot = {
  reviewerName: string;
  rating: number | null;
  body: string;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export type MetaRecommendationSentiment = "positive" | "negative" | "neutral";

export type NormalizedMetaRecommendation = {
  /** A real numeric Page rating, if Meta supplied one. Recommendation-only rows stay null. */
  rating: number | null;
  /** The explicit polarity Meta supplied for a recommendation-only row, or a derived safe value for a star rating. */
  sentiment: MetaRecommendationSentiment;
};

/**
 * Meta's Page ratings feed contains both numeric star ratings and binary
 * recommendations. A positive/negative recommendation is not a five-/one-star
 * rating, so it must retain a null rating and carry its polarity separately.
 */
export function normalizeMetaRecommendation(
  rating: number | null | undefined,
  recommendationType: string | null | undefined,
): NormalizedMetaRecommendation {
  if (typeof rating === "number" && Number.isFinite(rating)) {
    const normalizedRating = Math.max(0, Math.min(5, Math.round(rating)));
    return {
      rating: normalizedRating,
      sentiment: normalizedRating >= 4 ? "positive" : normalizedRating <= 2 ? "negative" : "neutral",
    };
  }

  const normalizedType = typeof recommendationType === "string"
    ? recommendationType.trim().toLowerCase()
    : "";

  if (normalizedType === "positive") {
    return { rating: null, sentiment: "positive" };
  }

  if (normalizedType === "negative") {
    return { rating: null, sentiment: "negative" };
  }

  return { rating: null, sentiment: "neutral" };
}

export function hasMetaReviewChanged(
  existing: ReviewSnapshot,
  incoming: ReviewSnapshot,
): boolean {
  return (
    existing.reviewerName !== incoming.reviewerName ||
    existing.rating !== incoming.rating ||
    existing.body !== incoming.body ||
    existing.sourceUpdatedAt?.getTime() !== incoming.sourceUpdatedAt?.getTime()
  );
}

export function normalizeMetaReviewerName(name?: string | null): string {
  if (!name) return "Facebook reviewer";
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Facebook reviewer";
}

export function normalizeMetaReviewText(text?: string | null): string {
  if (!text) return "No written review provided.";
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : "No written review provided.";
}
