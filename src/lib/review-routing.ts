/**
 * Per-location review routing.
 *
 * Ratings are split by negativeFilterThreshold:
 *   - LOW  (< threshold): recovery only — PRIVATE feedback (default) or a
 *     CUSTOM recovery URL. Never a public review platform.
 *   - HIGH (>= threshold): one or more public destinations. If exactly one is
 *     enabled, the customer goes straight to it; if several, they see a choice
 *     page with the admin-chosen primary destination highlighted.
 *
 * Defaults preserve historical behavior: low = PRIVATE, high = SINGLE [GOOGLE].
 */

export const HIGH_RATING_DESTINATIONS = ["GOOGLE", "FACEBOOK", "WEHEARYOU", "CUSTOM"] as const;
export type HighRatingDestination = (typeof HIGH_RATING_DESTINATIONS)[number];

export const LOW_RATING_DESTINATIONS = ["PRIVATE", "CUSTOM"] as const;
export type LowRatingDestination = (typeof LOW_RATING_DESTINATIONS)[number];

export const HIGH_RATING_MODES = ["SINGLE", "MULTIPLE"] as const;
export type HighRatingMode = (typeof HIGH_RATING_MODES)[number];

export const DEFAULT_LOW_RATING_DESTINATION: LowRatingDestination = "PRIVATE";
export const DEFAULT_HIGH_RATING_MODE: HighRatingMode = "SINGLE";
export const DEFAULT_HIGH_RATING_DESTINATIONS: HighRatingDestination[] = ["GOOGLE"];

// ── Validators ────────────────────────────────────────────────────────────────

export function isHighRatingDestination(v: unknown): v is HighRatingDestination {
  return typeof v === "string" && (HIGH_RATING_DESTINATIONS as readonly string[]).includes(v);
}

export function isLowRatingDestination(v: unknown): v is LowRatingDestination {
  return typeof v === "string" && (LOW_RATING_DESTINATIONS as readonly string[]).includes(v);
}

export function isHighRatingMode(v: unknown): v is HighRatingMode {
  return typeof v === "string" && (HIGH_RATING_MODES as readonly string[]).includes(v);
}

/** Filter to valid destinations, dedupe, and fall back to ["GOOGLE"] if empty. */
export function normalizeHighRatingDestinations(value: unknown): HighRatingDestination[] {
  const arr = Array.isArray(value) ? value : [];
  const valid = arr.filter(isHighRatingDestination);
  const deduped = Array.from(new Set(valid));
  return deduped.length > 0 ? deduped : [...DEFAULT_HIGH_RATING_DESTINATIONS];
}

export function normalizeLowRatingDestination(value: unknown): LowRatingDestination {
  return isLowRatingDestination(value) ? value : DEFAULT_LOW_RATING_DESTINATION;
}

export function normalizeHighRatingMode(value: unknown): HighRatingMode {
  return isHighRatingMode(value) ? value : DEFAULT_HIGH_RATING_MODE;
}

// ── High-rating resolution ────────────────────────────────────────────────────

export type HighRatingResolution =
  | { kind: "single"; destination: HighRatingDestination }
  | { kind: "choice"; destinations: HighRatingDestination[]; primary: HighRatingDestination };

/**
 * Decide what a HIGH rating should do given the saved config.
 * SINGLE (or a single enabled destination) → go straight there.
 * MULTIPLE with 2+ → choice page (primary listed first).
 */
export function resolveHighRating(
  mode: unknown,
  destinations: unknown,
  primary?: unknown,
): HighRatingResolution {
  const dests = normalizeHighRatingDestinations(destinations);
  const resolvedMode = normalizeHighRatingMode(mode);

  if (resolvedMode === "MULTIPLE" && dests.length > 1) {
    const primaryDest =
      isHighRatingDestination(primary) && dests.includes(primary) ? primary : dests[0];
    const ordered = [primaryDest, ...dests.filter((d) => d !== primaryDest)];
    return { kind: "choice", destinations: ordered, primary: primaryDest };
  }

  return { kind: "single", destination: dests[0] };
}

// ── Destination URL resolution ────────────────────────────────────────────────

export type DestinationUrlContext = {
  googleReviewLink: string | null; // already resolved (location.reviewLink or built link)
  facebookReviewUrl: string | null;
  customReviewUrl: string | null;
};

/**
 * External URL for a destination, or null. WEHEARYOU has no external URL — the
 * caller routes it to the internal review form instead.
 */
export function destinationExternalUrl(
  destination: HighRatingDestination,
  ctx: DestinationUrlContext,
): string | null {
  switch (destination) {
    case "GOOGLE":
      return ctx.googleReviewLink;
    case "FACEBOOK":
      return ctx.facebookReviewUrl;
    case "CUSTOM":
      return ctx.customReviewUrl;
    case "WEHEARYOU":
      return null;
  }
}

export function destinationLabel(destination: HighRatingDestination): string {
  switch (destination) {
    case "GOOGLE":
      return "Google";
    case "FACEBOOK":
      return "Facebook";
    case "WEHEARYOU":
      return "WeHearYou";
    case "CUSTOM":
      return "our review page";
  }
}
