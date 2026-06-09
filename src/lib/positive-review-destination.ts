/**
 * Where a location sends high/positive ratings after the funnel.
 *
 *  - GOOGLE    (default): existing behavior — promoters are handed off to the
 *              public Google review flow. Unchanged for every existing and new
 *              location unless an admin explicitly opts into WEHEARYOU.
 *  - WEHEARYOU: promoters are asked to leave a first-party review captured
 *              inside WeHearYou. Low/negative ratings are unaffected in both
 *              modes and keep using the existing private feedback path.
 */

export const POSITIVE_REVIEW_DESTINATIONS = ["GOOGLE", "WEHEARYOU"] as const;

export type PositiveReviewDestination = (typeof POSITIVE_REVIEW_DESTINATIONS)[number];

export const DEFAULT_POSITIVE_REVIEW_DESTINATION: PositiveReviewDestination = "GOOGLE";

export function isPositiveReviewDestination(value: unknown): value is PositiveReviewDestination {
  return typeof value === "string" && (POSITIVE_REVIEW_DESTINATIONS as readonly string[]).includes(value);
}

/** Normalize any stored/submitted value to a valid destination, defaulting to GOOGLE. */
export function normalizePositiveReviewDestination(value: unknown): PositiveReviewDestination {
  return isPositiveReviewDestination(value) ? value : DEFAULT_POSITIVE_REVIEW_DESTINATION;
}
