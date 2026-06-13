/**
 * Centralized rating style definitions and utilities.
 *
 * All rating modes (stars, faces, thumbs) normalize to a numeric value:
 * - Stars: 1-5 directly
 * - Faces: 1 (very unhappy) → 3 (neutral) → 5 (very happy)
 * - Thumbs: 1 (down) → 5 (up)
 *
 * These normalized values are compared with negativeFilterThreshold
 * for low/high rating routing.
 */

export type RatingMode = "stars" | "faces" | "thumbs";

export type RatingOption = {
  value: number;
  label: string;
  shortLabel: string;
  icon: string;
};

export const RATING_MODES = {
  stars: [
    { value: 1, label: "1 star", shortLabel: "1", icon: "★" },
    { value: 2, label: "2 stars", shortLabel: "2", icon: "★" },
    { value: 3, label: "3 stars", shortLabel: "3", icon: "★" },
    { value: 4, label: "4 stars", shortLabel: "4", icon: "★" },
    { value: 5, label: "5 stars", shortLabel: "5", icon: "★" },
  ],
  faces: [
    { value: 1, label: "Very unhappy", shortLabel: "Sad", icon: "😞" },
    { value: 3, label: "Neutral", shortLabel: "Okay", icon: "😐" },
    { value: 5, label: "Very happy", shortLabel: "Happy", icon: "😊" },
  ],
  thumbs: [
    { value: 1, label: "Thumbs down", shortLabel: "Needs work", icon: "👎" },
    { value: 5, label: "Thumbs up", shortLabel: "Loved it", icon: "👍" },
  ],
} as const;

/**
 * Get rating options for a given mode.
 * Defaults to stars if mode is invalid.
 */
export function getRatingOptions(mode: unknown): readonly RatingOption[] {
  if (mode === "faces") return RATING_MODES.faces;
  if (mode === "thumbs") return RATING_MODES.thumbs;
  return RATING_MODES.stars;
}

/**
 * Validate and normalize a rating mode string.
 * Returns "stars" as default if invalid.
 */
export function normalizeRatingMode(mode: unknown): RatingMode {
  if (mode === "faces" || mode === "thumbs") return mode as RatingMode;
  return "stars";
}

/**
 * Get icon/emoji for a given rating value and mode.
 * Used for displaying a rating choice after submission.
 */
export function getRatingDisplay(ratingValue: number, mode: RatingMode): string {
  if (mode === "thumbs") {
    return ratingValue === 1 ? "👎" : "👍";
  }
  if (mode === "faces") {
    return ratingValue <= 1 ? "😞" : ratingValue <= 3 ? "😐" : "😊";
  }
  // stars - rendered as individual stars, not a single icon
  return "★";
}

/**
 * Check if a numeric rating value is "high" (positive/favorable)
 * given the filter threshold and rating mode.
 *
 * For stars/thumbs: value >= threshold = high
 * For faces: special handling for the 3-value face scale:
 *   - If threshold is 3 (neutral+happy): values 3,5 = high
 *   - If threshold is 5 (happy only): only value 5 = high
 */
export function isHighRating(ratingValue: number, threshold: number, mode: RatingMode): boolean {
  if (mode === "faces") {
    // Face mode uses discrete values: 1 (sad), 3 (neutral), 5 (happy)
    // threshold 3 means "3 or higher" = neutral or happy
    // threshold 5 means "5 or higher" = happy only
    return ratingValue >= threshold;
  }

  // Stars and thumbs: simple numeric comparison
  return ratingValue >= threshold;
}
