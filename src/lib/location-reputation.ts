/**
 * Pure, database-free helpers that turn a location's loaded reviews into the
 * reputation metrics shown on the Locations portfolio cards (rating, trend,
 * sparkline, response rate, pending replies, source mix, health).
 *
 * Kept dependency-free (no Prisma runtime import) so it can be unit-tested
 * with plain objects via test-loader.mjs.
 */

export type ReviewSourceKey = "GOOGLE" | "FACEBOOK" | "YELP" | "INTERNAL";

export const SOURCE_ORDER: ReviewSourceKey[] = ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"];

/** Letter badge + Tailwind background class for each review source dot. */
export const SOURCE_META: Record<ReviewSourceKey, { label: string; letter: string; dotClass: string }> = {
  GOOGLE: { label: "Google", letter: "G", dotClass: "bg-sky-500" },
  FACEBOOK: { label: "Facebook", letter: "F", dotClass: "bg-indigo-500" },
  YELP: { label: "Yelp", letter: "Y", dotClass: "bg-rose-500" },
  INTERNAL: { label: "Direct", letter: "W", dotClass: "bg-emerald-500" },
};

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

export interface ReputationReview {
  rating: number | null;
  source: string;
  reviewedAt: Date | null;
  createdAt: Date;
  replyPublishedAt: Date | null;
  replySentAt: Date | null;
}

export interface ReputationLocationInput {
  id: string;
  avgRating: number | null;
  googleConnectionId: string | null;
  googleConnectedAt: Date | null;
  yelpConnectedAt: Date | null;
  lastSyncStatus: string | null;
  reviews: ReputationReview[];
  googleMappingHealth?: { status: string } | null;
}

export interface LocationReputation {
  rating: number | null;
  reviewCount: number;
  /** Change in average rating, last 30d vs prior 30d. null when either window has no rated reviews. */
  ratingDelta: number | null;
  /** Cumulative-average trend points (0-5), up to 10. Empty when there are too few rated reviews. */
  spark: number[];
  /** Share of reviews that have a reply, 0-100. null when there are no reviews. */
  responseRate: number | null;
  pending: number;
  newThisMonth: number;
  sources: ReviewSourceKey[];
  gbpConnected: boolean;
  health: "healthy" | "attention";
  hue: number;
}

const reviewDate = (r: ReputationReview): Date => r.reviewedAt ?? r.createdAt;
const isReplied = (r: ReputationReview): boolean => Boolean(r.replyPublishedAt || r.replySentAt);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

/** Deterministic 0-359 hue from a string id, for the location's pin tile color. */
export function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

function buildSpark(ratedChronological: number[]): number[] {
  if (ratedChronological.length < 3) return [];

  // Cumulative average after each review, then evenly downsample to <=10 points.
  const cumulative: number[] = [];
  let sum = 0;
  ratedChronological.forEach((value, i) => {
    sum += value;
    cumulative.push(sum / (i + 1));
  });

  const target = Math.min(10, cumulative.length);
  const points: number[] = [];
  for (let i = 0; i < target; i++) {
    const idx = Math.round((i * (cumulative.length - 1)) / (target - 1));
    points.push(round1(cumulative[idx]));
  }
  return points;
}

export function buildLocationReputation(location: ReputationLocationInput, now: Date = new Date()): LocationReputation {
  const reviews = location.reviews ?? [];
  const reviewCount = reviews.length;
  const nowMs = now.getTime();
  const windowMs = WINDOW_DAYS * DAY_MS;

  const ratedReviews = reviews.filter((r): r is ReputationReview & { rating: number } => typeof r.rating === "number");

  const rating =
    typeof location.avgRating === "number"
      ? location.avgRating
      : ratedReviews.length
        ? round1(mean(ratedReviews.map((r) => r.rating)))
        : null;

  // Rating trend: last 30 days vs the prior 30 days.
  const recent: number[] = [];
  const prior: number[] = [];
  for (const r of ratedReviews) {
    const age = nowMs - reviewDate(r).getTime();
    if (age >= 0 && age < windowMs) recent.push(r.rating);
    else if (age >= windowMs && age < windowMs * 2) prior.push(r.rating);
  }
  const ratingDelta = recent.length && prior.length ? round1(mean(recent) - mean(prior)) : null;

  const sparkSource = [...ratedReviews]
    .sort((a, b) => reviewDate(a).getTime() - reviewDate(b).getTime())
    .map((r) => r.rating);
  const spark = buildSpark(sparkSource);

  const responseRate = reviewCount ? Math.round((reviews.filter(isReplied).length / reviewCount) * 100) : null;
  const pending = reviews.filter((r) => !isReplied(r)).length;
  const newThisMonth = reviews.filter((r) => nowMs - reviewDate(r).getTime() < windowMs).length;

  const sourceSet = new Set<string>(reviews.map((r) => r.source));
  if (location.googleConnectedAt) sourceSet.add("GOOGLE");
  if (location.yelpConnectedAt) sourceSet.add("YELP");
  const sources = SOURCE_ORDER.filter((s) => sourceSet.has(s));

  const gbpConnected = Boolean(location.googleConnectionId || location.googleConnectedAt);

  const needsAttention =
    location.lastSyncStatus === "error" ||
    location.googleMappingHealth?.status === "malformed" ||
    pending >= 5 ||
    (rating !== null && rating < 4) ||
    (responseRate !== null && responseRate < 75);

  return {
    rating,
    reviewCount,
    ratingDelta,
    spark,
    responseRate,
    pending,
    newThisMonth,
    sources,
    gbpConnected,
    health: needsAttention ? "attention" : "healthy",
    hue: hueFromId(location.id),
  };
}
