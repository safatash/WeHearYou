/**
 * Canonical widget configuration semantics.
 *
 * This module is the single source of truth for every setting whose meaning has
 * to survive the trip:
 *
 *     editor draft state → saved row → public widget API → embed DOM/CSS
 *
 * It is deliberately dependency-free (no Prisma, no React, no `next/*`) so the
 * same functions run in three places:
 *
 *   1. the admin editor preview (browser),
 *   2. `getPublicReviewWidgetPayload` (server),
 *   3. indirectly in the public embed — the server resolves items/empty state
 *      with these functions and ships the *result* in the payload, so
 *      `embed/widget.js` never re-derives configuration semantics of its own.
 *
 * Every normalizer accepts unknown/legacy input and falls back to a documented
 * default rather than silently inverting meaning. Invalid values are reported
 * through `onInvalidWidgetValue` so they are observable in logs.
 */

/* ─── observability ───────────────────────────────────────────────────────── */

export type InvalidWidgetValue = {
  field: string;
  received: unknown;
  fallback: string;
};

let invalidValueSink: ((info: InvalidWidgetValue) => void) | null = null;

/** Register a reporter for malformed persisted config (server: console.warn). */
export function setInvalidWidgetValueReporter(fn: ((info: InvalidWidgetValue) => void) | null) {
  invalidValueSink = fn;
}

function reportInvalid(field: string, received: unknown, fallback: string): string {
  // Empty/absent is "not configured", not "malformed" — don't spam for those.
  if (received !== null && received !== undefined && String(received).trim() !== "") {
    invalidValueSink?.({ field, received, fallback });
  }
  return fallback;
}

/* ─── card heights ────────────────────────────────────────────────────────── */

/**
 * How Wall of Love cards are sized.
 *
 *  - `natural` — content-driven heights (CSS multi-column masonry). A long
 *    review makes a tall card.
 *  - `equal`   — cards align to equal heights within each grid row.
 *
 * Descriptive values only: never a boolean, never inverted. The persisted
 * column default is `equal`, which is what every widget rendered as before the
 * column existed, so adding the column does not change any existing widget.
 */
export const CARD_HEIGHTS = ["natural", "equal"] as const;
export type CardHeights = (typeof CARD_HEIGHTS)[number];
export const DEFAULT_CARD_HEIGHTS: CardHeights = "equal";

export function normalizeCardHeights(value?: string | null): CardHeights {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "natural" || v === "equal") return v;
  return reportInvalid("cardHeights", value, DEFAULT_CARD_HEIGHTS) as CardHeights;
}

/** True when cards should keep content-driven heights. */
export function usesNaturalHeights(value?: string | null): boolean {
  return normalizeCardHeights(value) === "natural";
}

/* ─── content mode ────────────────────────────────────────────────────────── */

/**
 * What a Wall of Love shows. The editor-facing key and the persisted
 * `ReviewWidget.contentType` value differ for historical reasons, so the
 * mapping lives here rather than being re-derived per call site.
 *
 *   REVIEWS ⇄ "TEXT"   VIDEOS ⇄ "VIDEO"   MIXED ⇄ "MIXED"
 */
export const CONTENT_MODES = ["REVIEWS", "VIDEOS", "MIXED"] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];
export const DEFAULT_CONTENT_MODE: ContentMode = "REVIEWS";

const STORED_BY_MODE: Record<ContentMode, string> = {
  REVIEWS: "TEXT",
  VIDEOS: "VIDEO",
  MIXED: "MIXED",
};

export function normalizeContentMode(stored?: string | null): ContentMode {
  const v = String(stored ?? "").trim().toUpperCase();
  if (v === "TEXT" || v === "REVIEWS") return "REVIEWS";
  if (v === "VIDEO" || v === "VIDEOS") return "VIDEOS";
  if (v === "MIXED") return "MIXED";
  return reportInvalid("contentType", stored, DEFAULT_CONTENT_MODE) as ContentMode;
}

export function contentModeToStored(mode: ContentMode): string {
  return STORED_BY_MODE[mode] ?? "TEXT";
}

export function contentModeIncludesReviews(mode: ContentMode): boolean {
  return mode === "REVIEWS" || mode === "MIXED";
}

export function contentModeIncludesVideos(mode: ContentMode): boolean {
  return mode === "VIDEOS" || mode === "MIXED";
}

/* ─── sources ─────────────────────────────────────────────────────────────── */

/**
 * Review platforms a widget can draw from. Canonical order is fixed so that
 * `enabledSources` serializes identically regardless of the order the admin
 * toggled things — otherwise the editor would report a false dirty state.
 */
export const REVIEW_SOURCES = ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"] as const;
export type ReviewSourceName = (typeof REVIEW_SOURCES)[number];

const SOURCE_ALIASES: Record<string, ReviewSourceName> = {
  GOOGLE: "GOOGLE",
  FACEBOOK: "FACEBOOK",
  META: "FACEBOOK",
  YELP: "YELP",
  INTERNAL: "INTERNAL",
  WEHEARYOU: "INTERNAL",
};

export const SOURCE_LABELS: Record<ReviewSourceName, string> = {
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  YELP: "Yelp",
  INTERNAL: "WeHearYou",
};

/**
 * Parse the persisted CSV into a canonical, de-duplicated, canonically-ordered
 * source list.
 *
 * An empty string means "every source" — that is the historical default and is
 * preserved so existing widgets keep drawing from everything they drew from
 * before.
 */
export function normalizeEnabledSources(csv?: string | null): ReviewSourceName[] {
  const raw = String(csv ?? "").trim();
  if (!raw) return [...REVIEW_SOURCES];

  const seen = new Set<ReviewSourceName>();
  for (const part of raw.split(",")) {
    const key = part.trim().toUpperCase();
    if (!key) continue;
    const mapped = SOURCE_ALIASES[key];
    if (mapped) seen.add(mapped);
    else reportInvalid("enabledSources", key, "(ignored)");
  }

  // A CSV that resolves to nothing usable is malformed, not "show nothing" —
  // fall back to every source rather than blanking a live widget.
  if (seen.size === 0) return [...REVIEW_SOURCES];
  return REVIEW_SOURCES.filter((s) => seen.has(s));
}

/**
 * Serialize back to the persisted CSV. "All sources enabled" round-trips to the
 * empty string so it keeps matching the historical default.
 */
export function serializeEnabledSources(sources: readonly string[]): string {
  const normalized = normalizeEnabledSources(sources.join(","));
  if (normalized.length === REVIEW_SOURCES.length) return "";
  return normalized.join(",");
}

/** True when the admin has narrowed the widget to a subset of platforms. */
export function hasSourceFilter(csv?: string | null): boolean {
  return normalizeEnabledSources(csv).length < REVIEW_SOURCES.length;
}

/* ─── pinned reviews ──────────────────────────────────────────────────────── */

/** Maximum pins the editor allows; enforced on write so the list can't grow unbounded. */
export const MAX_PINNED_REVIEWS = 8;

/**
 * Pinned review IDs are an *ordered* collection — the admin's pin order is the
 * display order — so this de-duplicates but never sorts.
 */
export function parsePinnedReviewIds(csv?: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(csv ?? "").split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PINNED_REVIEWS) break;
  }
  return out;
}

export function serializePinnedReviewIds(ids: readonly string[]): string {
  return parsePinnedReviewIds(ids.join(",")).join(",");
}

/* ─── review highlights ───────────────────────────────────────────────────── */

export type ReviewHighlight = { reviewId: string; quote: string };

export function parseReviewHighlights(json?: string | null): ReviewHighlight[] {
  const raw = String(json ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((h): h is ReviewHighlight =>
        Boolean(h) && typeof h.reviewId === "string" && typeof h.quote === "string" && h.quote.trim() !== "")
      .map((h) => ({ reviewId: h.reviewId, quote: h.quote }));
  } catch {
    reportInvalid("reviewHighlights", raw.slice(0, 40), "[]");
    return [];
  }
}

export function serializeReviewHighlights(highlights: readonly ReviewHighlight[]): string {
  const clean = highlights.filter((h) => h.reviewId && h.quote.trim() !== "");
  return clean.length > 0 ? JSON.stringify(clean.map((h) => ({ reviewId: h.reviewId, quote: h.quote }))) : "";
}

/* ─── effective content resolution ────────────────────────────────────────── */

export type WallReview = {
  id: string;
  source: string;
  rating: number;
  [key: string]: unknown;
};

export type WallVideo = {
  id: string;
  [key: string]: unknown;
};

export type WallItem =
  | { type: "review"; id: string; pinned: boolean; spotlight: boolean; data: WallReview }
  | { type: "video"; id: string; pinned: false; spotlight: false; data: WallVideo };

export type WallResolutionConfig = {
  contentMode: ContentMode;
  enabledSources: readonly string[];
  minRating: number;
  pageSize: number;
  pinnedReviewIds: readonly string[];
  spotlightReviewId?: string | null;
  /** Pinning/spotlight only apply to the first page; later pages stay in query order. */
  applyPriority?: boolean;
};

/**
 * Resolve the exact list of cards a Wall of Love renders.
 *
 * This is the one ordering/limiting function used by both the editor preview
 * and the public payload, so "what you configured" and "what visitors see"
 * cannot drift.
 *
 * Documented order of operations — the sequence matters and is asserted by
 * tests:
 *
 *   1. **Filter** reviews by enabled source and minimum rating. Videos carry no
 *      source and are never removed by the source filter; they are gated only
 *      by content mode.
 *   2. **De-duplicate** by `type:id`.
 *   3. **Prioritise** (first page only): spotlight review first, then pinned
 *      reviews in the admin's pin order, then everything else in the order the
 *      caller supplied (the query's sort). Pinned IDs that no longer resolve to
 *      an eligible review are skipped without disturbing the rest.
 *   4. **Interleave** for MIXED: emit one video after every 2 reviews, then
 *      append any leftover videos. Reviews lead so spotlight/pinned cards stay
 *      at the top.
 *   5. **Cap** the combined list to `pageSize`. The cap is applied *after*
 *      interleaving, so in MIXED mode `pageSize` limits total cards, not
 *      reviews alone.
 */
export function resolveWallItems(
  reviews: readonly WallReview[],
  videos: readonly WallVideo[],
  config: WallResolutionConfig,
): WallItem[] {
  const {
    contentMode,
    minRating,
    pageSize,
    spotlightReviewId = null,
    applyPriority = true,
  } = config;

  const enabled = new Set(normalizeEnabledSources(config.enabledSources.join(",")));
  const floor = Number.isFinite(minRating) ? minRating : 1;

  // 1 + 2 — filter and de-duplicate.
  const seenReviews = new Set<string>();
  const eligibleReviews = contentModeIncludesReviews(contentMode)
    ? reviews.filter((r) => {
        if (!r || typeof r.id !== "string" || seenReviews.has(r.id)) return false;
        const source = SOURCE_ALIASES[String(r.source ?? "").trim().toUpperCase()];
        if (!source || !enabled.has(source)) return false;
        if ((r.rating ?? 0) < floor) return false;
        seenReviews.add(r.id);
        return true;
      })
    : [];

  const seenVideos = new Set<string>();
  const eligibleVideos = contentModeIncludesVideos(contentMode)
    ? videos.filter((v) => {
        if (!v || typeof v.id !== "string" || seenVideos.has(v.id)) return false;
        seenVideos.add(v.id);
        return true;
      })
    : [];

  // 3 — priority ordering.
  const pinnedIds = applyPriority ? parsePinnedReviewIds(config.pinnedReviewIds.join(",")) : [];
  const spotlightId = applyPriority ? spotlightReviewId : null;
  const byId = new Map(eligibleReviews.map((r) => [r.id, r]));

  const orderedReviews: Array<{ review: WallReview; pinned: boolean; spotlight: boolean }> = [];
  const placed = new Set<string>();

  const spotlight = spotlightId ? byId.get(spotlightId) : undefined;
  if (spotlight) {
    orderedReviews.push({ review: spotlight, pinned: pinnedIds.includes(spotlight.id), spotlight: true });
    placed.add(spotlight.id);
  }
  for (const id of pinnedIds) {
    if (placed.has(id)) continue;
    const review = byId.get(id);
    // A deleted / no-longer-eligible pin is skipped, not fatal.
    if (!review) continue;
    orderedReviews.push({ review, pinned: true, spotlight: false });
    placed.add(id);
  }
  for (const review of eligibleReviews) {
    if (placed.has(review.id)) continue;
    orderedReviews.push({ review, pinned: false, spotlight: false });
    placed.add(review.id);
  }

  const reviewItems: WallItem[] = orderedReviews.map((entry) => ({
    type: "review",
    id: entry.review.id,
    pinned: entry.pinned,
    spotlight: entry.spotlight,
    data: entry.review,
  }));
  const videoItems: WallItem[] = eligibleVideos.map((v) => ({
    type: "video",
    id: v.id,
    pinned: false,
    spotlight: false,
    data: v,
  }));

  // 4 — interleave.
  let combined: WallItem[];
  if (contentMode === "REVIEWS") {
    combined = reviewItems;
  } else if (contentMode === "VIDEOS") {
    combined = videoItems;
  } else {
    combined = [];
    let vi = 0;
    for (let ri = 0; ri < reviewItems.length; ri++) {
      combined.push(reviewItems[ri]);
      if ((ri + 1) % 2 === 0 && vi < videoItems.length) combined.push(videoItems[vi++]);
    }
    while (vi < videoItems.length) combined.push(videoItems[vi++]);
  }

  // 5 — cap.
  const cap = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : combined.length;
  return combined.slice(0, cap);
}

/* ─── owner responses ─────────────────────────────────────────────────────── */

export type OwnerResponseSource = {
  source: string;
  /** Reply text mirrored from the external platform (already public there). */
  sourceReplyText?: string | null;
  /** Admin-authored reply. Private until published/sent. */
  replyDraft?: string | null;
  replyPublishedAt?: Date | string | null;
  replySentAt?: Date | string | null;
};

/**
 * The owner response a visitor may see, or null.
 *
 * Two rules, both load-bearing:
 *
 *  - **Privacy.** An admin-authored `replyDraft` is internal until it has been
 *    published (or, for external platforms, sent). An unpublished draft must
 *    never reach the public payload.
 *  - **Config fidelity.** With `showResponses` off the text is omitted from the
 *    payload entirely rather than shipped and hidden by CSS.
 */
export function resolvePublicOwnerResponse(
  review: OwnerResponseSource,
  showResponses: boolean,
): string | null {
  if (!showResponses) return null;

  const draft = review.replyDraft ?? null;
  const published = Boolean(review.replyPublishedAt);

  if (String(review.source ?? "").toUpperCase() === "INTERNAL") {
    // WeHearYou-native reviews have no upstream reply to mirror.
    return published ? draft : null;
  }

  if (review.sourceReplyText) return review.sourceReplyText;
  return published || Boolean(review.replySentAt) ? draft : null;
}

/* ─── empty state ─────────────────────────────────────────────────────────── */

export type WallEmptyState = {
  category: "no_content" | "no_videos" | "filtered_out";
  title: string;
  message: string;
};

/**
 * Decide what to show when a wall resolves to zero cards.
 *
 * The categories are deliberately distinct so the editor preview and the public
 * embed can be asserted to show *the same* empty state rather than merely both
 * being blank. Nothing here invents rating totals, business names or
 * testimonials.
 */
export function resolveWallEmptyState(
  itemCount: number,
  config: Pick<WallResolutionConfig, "contentMode" | "enabledSources" | "minRating">,
): WallEmptyState | null {
  if (itemCount > 0) return null;

  const filtered =
    hasSourceFilter(config.enabledSources.join(",")) ||
    (Number.isFinite(config.minRating) && config.minRating > 1);

  if (config.contentMode === "VIDEOS") {
    return {
      category: "no_videos",
      title: "No video testimonials yet",
      message: "Published video testimonials for this location will appear here.",
    };
  }

  if (filtered) {
    return {
      category: "filtered_out",
      title: "No reviews match these filters",
      message: "Try enabling more sources or lowering the minimum rating.",
    };
  }

  return {
    category: "no_content",
    title: "No reviews yet",
    message: "Reviews for this location will appear here once they are published.",
  };
}

/* ─── widget type registry ────────────────────────────────────────────────── */

export type WidgetTypeKey =
  | "WALL_OF_LOVE"
  | "SINGLE_TESTIMONIAL"
  | "BADGE"
  | "COLLECTING"
  | "FLOATING";

export type WidgetPlacement = "mount" | "head";

export type WidgetTypeMeta = {
  /** Canonical persisted `ReviewWidget.widgetType`. */
  key: WidgetTypeKey;
  /** Editor sub-variant key, where one persisted type has several editor cards. */
  studioKey: string;
  label: string;
  description: string;
  icon: string;
  /** `mount` = a div where the content should appear; `head` = global script. */
  placement: WidgetPlacement;
  placementHint: string;
};

/**
 * One typed registry behind every human-readable widget label: the inventory
 * card subtitle, the editor type picker, and the embed placement instructions
 * all read from here, so a widget can never be described as one type in the
 * list and another in its editor.
 *
 * `WALL_OF_LOVE` has two studio variants (grid / carousel) that differ only by
 * layout, so the registry is keyed by studio key and carries the persisted
 * `key` alongside.
 */
export const WIDGET_TYPE_REGISTRY: Record<string, WidgetTypeMeta> = {
  grid: {
    key: "WALL_OF_LOVE",
    studioKey: "grid",
    label: "Wall of Love",
    description: "Masonry of reviews",
    icon: "grid",
    placement: "mount",
    placementHint: "Paste where you want it to appear",
  },
  carousel: {
    key: "WALL_OF_LOVE",
    studioKey: "carousel",
    label: "Review marquee",
    description: "Auto-scrolling rows of reviews",
    icon: "layers",
    placement: "mount",
    placementHint: "Paste where you want it to appear",
  },
  single: {
    key: "SINGLE_TESTIMONIAL",
    studioKey: "single",
    label: "Single testimonial",
    description: "One standout quote",
    icon: "film",
    placement: "mount",
    placementHint: "Paste where you want it to appear",
  },
  badge: {
    key: "BADGE",
    studioKey: "badge",
    label: "Rating badge",
    description: "Compact score + stars",
    icon: "star",
    placement: "mount",
    placementHint: "Paste where you want it to appear",
  },
  collecting: {
    key: "COLLECTING",
    studioKey: "collecting",
    label: "Collect reviews",
    description: "Floating feedback button",
    icon: "send",
    placement: "head",
    placementHint: "Add to global <head>",
  },
  floating: {
    key: "FLOATING",
    studioKey: "floating",
    label: "Floating badge",
    description: "Sticky social-proof card",
    icon: "chat",
    placement: "head",
    placementHint: "Add to global <head>",
  },
};

/** Layouts that render as the auto-scrolling marquee variant. */
const CAROUSEL_LAYOUTS = new Set(["carousel", "slider", "video-carousel", "mixed-carousel"]);

function isCarouselLayout(layout: string): boolean {
  return CAROUSEL_LAYOUTS.has(layout);
}

/**
 * Map a saved row to its registry entry. `widgetType` is authoritative; layout
 * only distinguishes the two Wall of Love variants and is consulted for legacy
 * rows that predate `widgetType`.
 */
export function resolveWidgetTypeMeta(
  widgetType?: string | null,
  layout?: string | null,
): WidgetTypeMeta {
  const t = String(widgetType ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const l = String(layout ?? "").trim().toLowerCase();

  if (t === "COLLECTING") return WIDGET_TYPE_REGISTRY.collecting;
  if (t === "FLOATING") return WIDGET_TYPE_REGISTRY.floating;
  if (t === "BADGE") return WIDGET_TYPE_REGISTRY.badge;
  if (t === "SINGLE_TESTIMONIAL" || t === "TESTIMONIAL") return WIDGET_TYPE_REGISTRY.single;
  if (t === "WALL_OF_LOVE") {
    return isCarouselLayout(l) ? WIDGET_TYPE_REGISTRY.carousel : WIDGET_TYPE_REGISTRY.grid;
  }

  // Legacy rows with no widgetType: fall back to layout.
  if (l === "floating") return WIDGET_TYPE_REGISTRY.floating;
  if (l === "badge") return WIDGET_TYPE_REGISTRY.badge;
  if (isCarouselLayout(l)) return WIDGET_TYPE_REGISTRY.carousel;
  return WIDGET_TYPE_REGISTRY.grid;
}

/* ─── draft / dirty comparison ────────────────────────────────────────────── */

/**
 * Normalize a widget draft into a comparable shape.
 *
 * Order-insensitive collections (enabled sources) are canonically sorted;
 * order-sensitive ones (pinned review IDs) keep their order. Numbers are
 * coerced and strings trimmed so that, e.g., re-selecting the value a control
 * already had never registers as a change.
 */
export function normalizeWidgetDraft(draft: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(draft).sort()) {
    const value = draft[key];
    if (key === "enabledSources") {
      out[key] = serializeEnabledSources(
        Array.isArray(value) ? (value as string[]) : String(value ?? "").split(","),
      );
    } else if (key === "pinnedReviewIds") {
      out[key] = serializePinnedReviewIds(
        Array.isArray(value) ? (value as string[]) : String(value ?? "").split(","),
      );
    } else if (key === "reviewHighlights") {
      out[key] = Array.isArray(value)
        ? serializeReviewHighlights(value as ReviewHighlight[])
        : serializeReviewHighlights(parseReviewHighlights(String(value ?? "")));
    } else if (typeof value === "string") {
      out[key] = value.trim();
    } else if (value === null || value === undefined) {
      out[key] = null;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Normalized, order-aware equality used to drive the editor's dirty state. */
export function widgetDraftsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(normalizeWidgetDraft(a)) === JSON.stringify(normalizeWidgetDraft(b));
}
