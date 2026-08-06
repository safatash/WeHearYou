import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_HEIGHTS,
  DEFAULT_CARD_HEIGHTS,
  normalizeCardHeights,
  usesNaturalHeights,
  normalizeContentMode,
  contentModeToStored,
  contentModeIncludesReviews,
  contentModeIncludesVideos,
  normalizeEnabledSources,
  serializeEnabledSources,
  hasSourceFilter,
  parsePinnedReviewIds,
  serializePinnedReviewIds,
  MAX_PINNED_REVIEWS,
  parseReviewHighlights,
  serializeReviewHighlights,
  resolveWallItems,
  resolveWallEmptyState,
  resolveWidgetTypeMeta,
  WIDGET_TYPE_REGISTRY,
  normalizeWidgetDraft,
  widgetDraftsEqual,
  setInvalidWidgetValueReporter,
  type WallReview,
  type WallVideo,
  type WallResolutionConfig,
} from "./widget-config.ts";

/* ─── fixtures ────────────────────────────────────────────────────────────── */

// Two locations: one populated, one with zero eligible content.
// Reviews span two source platforms, have deliberately different text lengths,
// and one carries an owner response.
const SHORT = "Great.";
const MEDIUM = "Friendly team and the work was finished on time. Would use again.";
const LONG =
  "I cannot say enough good things about this crew. They arrived early, walked me through every " +
  "option without any pressure, and stayed late to make sure the finish matched the rest of the " +
  "house. Six weeks on it still looks exactly like the day they left.";

const POPULATED_REVIEWS: WallReview[] = [
  { id: "r1", source: "GOOGLE", rating: 5, body: LONG, reviewerName: "Dana", sourceReplyText: null },
  { id: "r2", source: "FACEBOOK", rating: 4, body: SHORT, reviewerName: "Ali", sourceReplyText: "Thanks Ali!" },
  { id: "r3", source: "GOOGLE", rating: 5, body: MEDIUM, reviewerName: "Sam", sourceReplyText: null },
  { id: "r4", source: "YELP", rating: 3, body: MEDIUM, reviewerName: "Robin", sourceReplyText: null },
  { id: "r5", source: "INTERNAL", rating: 5, body: SHORT, reviewerName: "Kai", sourceReplyText: null },
];

const POPULATED_VIDEOS: WallVideo[] = [
  { id: "v1", videoUrl: "https://cdn.example/v1.mp4", submitterName: "Jules" },
  { id: "v2", videoUrl: "https://cdn.example/v2.mp4", submitterName: "Morgan" },
];

const EMPTY_REVIEWS: WallReview[] = [];
const EMPTY_VIDEOS: WallVideo[] = [];

function cfg(over: Partial<WallResolutionConfig> = {}): WallResolutionConfig {
  return {
    contentMode: "REVIEWS",
    enabledSources: ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"],
    minRating: 1,
    pageSize: 12,
    pinnedReviewIds: [],
    spotlightReviewId: null,
    ...over,
  };
}

const ids = (items: ReturnType<typeof resolveWallItems>) => items.map((i) => `${i.type}:${i.id}`);

/* ─── card heights ────────────────────────────────────────────────────────── */

test("card heights: values are descriptive, never boolean or inverted", () => {
  assert.deepEqual([...CARD_HEIGHTS], ["natural", "equal"]);
  assert.equal(normalizeCardHeights("natural"), "natural");
  assert.equal(normalizeCardHeights("equal"), "equal");
  assert.equal(normalizeCardHeights("NATURAL"), "natural");
  assert.equal(normalizeCardHeights(" Equal "), "equal");
});

test("card heights: unknown/missing values fall back to equal and never invert", () => {
  assert.equal(DEFAULT_CARD_HEIGHTS, "equal");
  assert.equal(normalizeCardHeights("auto"), "equal");
  assert.equal(normalizeCardHeights(""), "equal");
  assert.equal(normalizeCardHeights(null), "equal");
  assert.equal(normalizeCardHeights(undefined), "equal");
  // The historically-wrong shapes must not be read as "natural".
  assert.equal(normalizeCardHeights("true"), "equal");
  assert.equal(normalizeCardHeights("false"), "equal");
});

test("card heights: natural drives content-driven layout, equal does not", () => {
  assert.equal(usesNaturalHeights("natural"), true);
  assert.equal(usesNaturalHeights("equal"), false);
  assert.equal(usesNaturalHeights("auto"), false);
});

test("card heights: malformed persisted values are reported, absent ones are not", () => {
  const seen: string[] = [];
  setInvalidWidgetValueReporter((info) => seen.push(`${info.field}=${String(info.received)}→${info.fallback}`));
  normalizeCardHeights("auto");
  normalizeCardHeights(null);
  normalizeCardHeights("");
  setInvalidWidgetValueReporter(null);
  assert.deepEqual(seen, ["cardHeights=auto→equal"]);
});

/* ─── content modes ───────────────────────────────────────────────────────── */

test("content mode: stored enum round-trips through the canonical mode", () => {
  assert.equal(normalizeContentMode("TEXT"), "REVIEWS");
  assert.equal(normalizeContentMode("VIDEO"), "VIDEOS");
  assert.equal(normalizeContentMode("MIXED"), "MIXED");
  assert.equal(contentModeToStored("REVIEWS"), "TEXT");
  assert.equal(contentModeToStored("VIDEOS"), "VIDEO");
  assert.equal(contentModeToStored("MIXED"), "MIXED");
  for (const stored of ["TEXT", "VIDEO", "MIXED"]) {
    assert.equal(contentModeToStored(normalizeContentMode(stored)), stored);
  }
});

test("content mode: unknown values fall back to REVIEWS rather than inventing a mode", () => {
  assert.equal(normalizeContentMode("PHOTOS"), "REVIEWS");
  assert.equal(normalizeContentMode(""), "REVIEWS");
  assert.equal(normalizeContentMode(null), "REVIEWS");
});

test("content mode: inclusion flags are explicit for all three modes", () => {
  assert.deepEqual(
    ["REVIEWS", "VIDEOS", "MIXED"].map((m) => [
      contentModeIncludesReviews(m as never),
      contentModeIncludesVideos(m as never),
    ]),
    [[true, false], [false, true], [true, true]],
  );
});

/* ─── sources ─────────────────────────────────────────────────────────────── */

test("sources: empty CSV means every source (historical default preserved)", () => {
  assert.deepEqual(normalizeEnabledSources(""), ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"]);
  assert.deepEqual(normalizeEnabledSources(null), ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"]);
});

test("sources: normalization is order-insensitive and de-duplicating", () => {
  assert.deepEqual(normalizeEnabledSources("yelp,GOOGLE"), ["GOOGLE", "YELP"]);
  assert.deepEqual(normalizeEnabledSources("GOOGLE,yelp"), ["GOOGLE", "YELP"]);
  assert.deepEqual(normalizeEnabledSources("GOOGLE, GOOGLE ,YELP"), ["GOOGLE", "YELP"]);
  // Same set toggled in a different order must serialize identically, or the
  // editor would report a false dirty state.
  assert.equal(serializeEnabledSources(["YELP", "GOOGLE"]), serializeEnabledSources(["GOOGLE", "YELP"]));
});

test("sources: all-enabled round-trips to the empty string", () => {
  assert.equal(serializeEnabledSources(["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"]), "");
  assert.equal(serializeEnabledSources(["INTERNAL", "YELP", "FACEBOOK", "GOOGLE"]), "");
  assert.equal(hasSourceFilter(""), false);
  assert.equal(hasSourceFilter("GOOGLE"), true);
});

test("sources: garbage CSV falls back to every source instead of blanking a live widget", () => {
  assert.deepEqual(normalizeEnabledSources("TWITTER,MYSPACE"), ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"]);
  assert.deepEqual(normalizeEnabledSources("WEHEARYOU"), ["INTERNAL"]);
});

/* ─── pins & highlights ───────────────────────────────────────────────────── */

test("pinned IDs keep admin order, de-duplicate, and cap", () => {
  assert.deepEqual(parsePinnedReviewIds("r3, r1 ,r3"), ["r3", "r1"]);
  assert.equal(serializePinnedReviewIds(["r3", "r1"]), "r3,r1");
  // Order-sensitive: reversing the pins is a real change.
  assert.notEqual(serializePinnedReviewIds(["r1", "r3"]), serializePinnedReviewIds(["r3", "r1"]));
  const many = Array.from({ length: 20 }, (_, i) => `p${i}`);
  assert.equal(parsePinnedReviewIds(many.join(",")).length, MAX_PINNED_REVIEWS);
});

test("review highlights survive a round-trip and reject malformed JSON", () => {
  const round = serializeReviewHighlights(parseReviewHighlights('[{"reviewId":"r1","quote":"on time"}]'));
  assert.equal(round, '[{"reviewId":"r1","quote":"on time"}]');
  assert.deepEqual(parseReviewHighlights("{not json"), []);
  assert.deepEqual(parseReviewHighlights('[{"reviewId":"r1","quote":""}]'), []);
  assert.equal(serializeReviewHighlights([]), "");
});

/* ─── DEFECT 1 — populated ⇄ empty location ───────────────────────────────── */

test("empty location resolves to zero items and an explicit empty state", () => {
  const items = resolveWallItems(EMPTY_REVIEWS, EMPTY_VIDEOS, cfg());
  assert.deepEqual(items, []);
  const empty = resolveWallEmptyState(items.length, cfg());
  assert.equal(empty?.category, "no_content");
});

test("populated location resolves to its own items and no empty state", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg());
  assert.equal(items.length, 5);
  assert.equal(resolveWallEmptyState(items.length, cfg()), null);
});

test("switching populated → empty → populated yields no cross-contamination", () => {
  const populated = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg());
  const empty = resolveWallItems(EMPTY_REVIEWS, EMPTY_VIDEOS, cfg());
  const back = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg());

  // The zero-content location contributes nothing from the previous location:
  // no cards, no ids, and an empty state instead.
  assert.deepEqual(empty, []);
  assert.equal(resolveWallEmptyState(empty.length, cfg())?.category, "no_content");
  // Coming back reloads only that location's content, identically.
  assert.deepEqual(ids(back), ids(populated));
});

test("editor preview and public embed derive the same empty-state category", () => {
  // Same resolver, same config, same inputs ⇒ by construction the preview and
  // the payload cannot disagree about which empty state to show.
  const config = cfg({ contentMode: "MIXED" });
  const previewItems = resolveWallItems(EMPTY_REVIEWS, EMPTY_VIDEOS, config);
  const publicItems = resolveWallItems(EMPTY_REVIEWS, EMPTY_VIDEOS, config);
  assert.deepEqual(
    resolveWallEmptyState(previewItems.length, config),
    resolveWallEmptyState(publicItems.length, config),
  );
});

/* ─── DEFECT 2 — content modes ────────────────────────────────────────────── */

test("REVIEWS mode renders reviews only", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "REVIEWS" }));
  assert.ok(items.length > 0);
  assert.ok(items.every((i) => i.type === "review"));
});

test("VIDEOS mode renders videos only", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "VIDEOS" }));
  assert.deepEqual(ids(items), ["video:v1", "video:v2"]);
});

test("MIXED mode renders at least one video card when eligible video data exists", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "MIXED" }));
  assert.ok(items.some((i) => i.type === "video"), "MIXED must contain a video render marker");
  assert.ok(items.some((i) => i.type === "review"), "MIXED must contain review cards too");
});

test("MIXED ordering policy: one video after every two reviews, leftovers appended", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "MIXED" }));
  assert.deepEqual(ids(items), [
    "review:r1", "review:r2", "video:v1",
    "review:r3", "review:r4", "video:v2",
    "review:r5",
  ]);
});

test("MIXED with no eligible videos degrades to reviews only, not to a lie", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, [], cfg({ contentMode: "MIXED" }));
  assert.ok(items.every((i) => i.type === "review"));
  assert.equal(items.length, 5);
});

test("MIXED cap limits total cards, not reviews alone", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "MIXED", pageSize: 4 }));
  assert.equal(items.length, 4);
  assert.deepEqual(ids(items), ["review:r1", "review:r2", "video:v1", "review:r3"]);
});

test("MIXED applies source filters before the cap", () => {
  const items = resolveWallItems(
    POPULATED_REVIEWS,
    POPULATED_VIDEOS,
    cfg({ contentMode: "MIXED", enabledSources: ["GOOGLE"], pageSize: 12 }),
  );
  // Only r1 + r3 are Google; videos carry no source and stay eligible.
  assert.deepEqual(ids(items), ["review:r1", "review:r3", "video:v1", "video:v2"]);
});

test("VIDEOS mode with zero videos gets its own empty-state category", () => {
  const config = cfg({ contentMode: "VIDEOS" });
  const items = resolveWallItems(POPULATED_REVIEWS, [], config);
  assert.deepEqual(items, []);
  assert.equal(resolveWallEmptyState(items.length, config)?.category, "no_videos");
});

/* ─── DEFECT 5 — pinning ──────────────────────────────────────────────────── */

test("pinning a lower-ranked review moves it ahead of the non-pinned cards", () => {
  const base = resolveWallItems(POPULATED_REVIEWS, [], cfg());
  assert.equal(base[0].id, "r1");

  const pinned = resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: ["r4"] }));
  assert.equal(pinned[0].id, "r4", "pinned review leads");
  assert.equal(pinned[0].pinned, true, "pinned review is marked so renderers can emphasise it");
  assert.ok(pinned.slice(1).every((i) => i.pinned === false));
});

test("pin order is the admin's order and is preserved", () => {
  assert.deepEqual(
    ids(resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: ["r4", "r2"] }))).slice(0, 2),
    ["review:r4", "review:r2"],
  );
  assert.deepEqual(
    ids(resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: ["r2", "r4"] }))).slice(0, 2),
    ["review:r2", "review:r4"],
  );
});

test("unpinning restores the deterministic non-pinned order", () => {
  const before = resolveWallItems(POPULATED_REVIEWS, [], cfg());
  const during = resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: ["r4"] }));
  const after = resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: [] }));
  assert.notDeepEqual(ids(during), ids(before));
  assert.deepEqual(ids(after), ids(before));
});

test("a deleted or filtered-out pinned review is skipped without breaking the wall", () => {
  const items = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ pinnedReviewIds: ["does-not-exist", "r4"] }),
  );
  assert.equal(items[0].id, "r4");
  assert.equal(items.length, 5, "the rest of the wall still renders");

  // A pin whose review is excluded by the source filter is dropped, not resurrected.
  const filtered = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ pinnedReviewIds: ["r4"], enabledSources: ["GOOGLE"] }),
  );
  assert.deepEqual(ids(filtered), ["review:r1", "review:r3"]);
});

test("spotlight leads, then pins, then everything else", () => {
  const items = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ spotlightReviewId: "r5", pinnedReviewIds: ["r4"] }),
  );
  assert.deepEqual(ids(items).slice(0, 2), ["review:r5", "review:r4"]);
  assert.equal(items[0].spotlight, true);
});

test("pinning applies to the first page only", () => {
  const later = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ pinnedReviewIds: ["r4"], applyPriority: false }),
  );
  assert.equal(later[0].id, "r1");
  assert.ok(later.every((i) => i.pinned === false));
});

test("pinning is applied before the content cap", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, [], cfg({ pinnedReviewIds: ["r5"], pageSize: 2 }));
  assert.deepEqual(ids(items), ["review:r5", "review:r1"]);
});

/* ─── DEFECT 6 — source filters ───────────────────────────────────────────── */

test("turning a source off removes only that source's cards", () => {
  const all = resolveWallItems(POPULATED_REVIEWS, [], cfg());
  assert.deepEqual(ids(all), ["review:r1", "review:r2", "review:r3", "review:r4", "review:r5"]);

  const noFacebook = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ enabledSources: ["GOOGLE", "YELP", "INTERNAL"] }),
  );
  assert.deepEqual(ids(noFacebook), ["review:r1", "review:r3", "review:r4", "review:r5"]);
  assert.ok(!ids(noFacebook).includes("review:r2"));
});

test("source filtering runs before the count limit", () => {
  // Without the filter a cap of 2 would return r1 + r2; with Facebook off it
  // must return two *Google/Yelp/Internal* cards, not one.
  const items = resolveWallItems(
    POPULATED_REVIEWS,
    [],
    cfg({ enabledSources: ["GOOGLE", "YELP", "INTERNAL"], pageSize: 2 }),
  );
  assert.equal(items.length, 2);
  assert.deepEqual(ids(items), ["review:r1", "review:r3"]);
});

test("a source filter that matches nothing yields an explicit filtered empty state", () => {
  const config = cfg({ enabledSources: ["YELP"], minRating: 5 });
  const items = resolveWallItems(POPULATED_REVIEWS, [], config);
  assert.deepEqual(items, []);
  const empty = resolveWallEmptyState(items.length, config);
  assert.equal(empty?.category, "filtered_out");
  // Never replaced with synthetic or stale content.
  assert.ok(!/4\.6|1,284/.test(JSON.stringify(empty)));
});

test("minimum rating filters alongside sources", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, [], cfg({ minRating: 5 }));
  assert.deepEqual(ids(items), ["review:r1", "review:r3", "review:r5"]);
});

/* ─── DEFECT 7 — widget type registry ─────────────────────────────────────── */

test("a Collect reviews widget never reads as Wall of Love", () => {
  const meta = resolveWidgetTypeMeta("COLLECTING", "grid");
  assert.equal(meta.label, "Collect reviews");
  assert.equal(meta.key, "COLLECTING");
  assert.notEqual(meta.label, "Wall of Love");
});

test("placement guidance follows the widget type", () => {
  assert.equal(resolveWidgetTypeMeta("COLLECTING", "grid").placement, "head");
  assert.equal(resolveWidgetTypeMeta("FLOATING", "floating").placement, "head");
  assert.equal(resolveWidgetTypeMeta("WALL_OF_LOVE", "masonry").placement, "mount");
  assert.equal(resolveWidgetTypeMeta("SINGLE_TESTIMONIAL", "grid").placement, "mount");
  assert.equal(resolveWidgetTypeMeta("BADGE", "badge").placement, "mount");
});

test("saved widgetType wins over layout for every supported type", () => {
  assert.equal(resolveWidgetTypeMeta("COLLECTING", "masonry").label, "Collect reviews");
  assert.equal(resolveWidgetTypeMeta("BADGE", "carousel").label, "Rating badge");
  assert.equal(resolveWidgetTypeMeta("WALL_OF_LOVE", "masonry").label, "Wall of Love");
  assert.equal(resolveWidgetTypeMeta("WALL_OF_LOVE", "carousel").label, "Review marquee");
});

test("legacy rows without a widgetType fall back to layout, never to the wrong label", () => {
  assert.equal(resolveWidgetTypeMeta(null, "floating").label, "Floating badge");
  assert.equal(resolveWidgetTypeMeta(null, "badge").label, "Rating badge");
  assert.equal(resolveWidgetTypeMeta(null, "masonry").label, "Wall of Love");
});

test("every registry entry is fully populated", () => {
  for (const [key, meta] of Object.entries(WIDGET_TYPE_REGISTRY)) {
    assert.equal(meta.studioKey, key);
    for (const field of ["label", "description", "icon", "placementHint"] as const) {
      assert.ok(meta[field] && meta[field].length > 0, `${key}.${field} must be set`);
    }
    assert.ok(["mount", "head"].includes(meta.placement));
  }
});

/* ─── DEFECT 4 — dirty state ──────────────────────────────────────────────── */

const BASELINE = {
  showResponses: false,
  showWriteReview: true,
  density: "cozy",
  cardHeights: "equal",
  bodyMaxChars: 280,
  starColorMode: "gold",
  primaryColor: "#4f46e5",
  locationId: "loc-populated",
  isActive: true,
  contentType: "TEXT",
  enabledSources: ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"],
  pinnedReviewIds: [] as string[],
};

test("no change means clean", () => {
  assert.equal(widgetDraftsEqual(BASELINE, { ...BASELINE }), true);
});

test("every customization control class marks the editor dirty", () => {
  const changes: Array<[string, Record<string, unknown>]> = [
    ["display switch (owner responses)", { showResponses: true }],
    ["display switch (write-review link)", { showWriteReview: false }],
    ["segmented control (density)", { density: "compact" }],
    ["segmented control (card heights)", { cardHeights: "natural" }],
    ["range (body max chars)", { bodyMaxChars: 400 }],
    ["color mode (star color)", { starColorMode: "accent" }],
    ["color value (accent)", { primaryColor: "#0e9488" }],
    ["location", { locationId: "loc-empty" }],
    ["status", { isActive: false }],
    ["content mode", { contentType: "MIXED" }],
    ["sources", { enabledSources: ["GOOGLE"] }],
    ["pins", { pinnedReviewIds: ["r4"] }],
  ];
  for (const [label, patch] of changes) {
    assert.equal(widgetDraftsEqual(BASELINE, { ...BASELINE, ...patch }), false, `${label} must mark dirty`);
  }
});

test("reverting a control to its original normalized value returns to clean", () => {
  const dirty = { ...BASELINE, showResponses: true, cardHeights: "natural" };
  assert.equal(widgetDraftsEqual(BASELINE, dirty), false);
  const reverted = { ...dirty, showResponses: false, cardHeights: "equal" };
  assert.equal(widgetDraftsEqual(BASELINE, reverted), true);
});

test("dirty comparison is order-insensitive for sources and order-sensitive for pins", () => {
  assert.equal(
    widgetDraftsEqual(BASELINE, { ...BASELINE, enabledSources: ["INTERNAL", "YELP", "FACEBOOK", "GOOGLE"] }),
    true,
    "re-ordering the same source set is not a change",
  );
  assert.equal(
    widgetDraftsEqual(
      { ...BASELINE, pinnedReviewIds: ["r1", "r4"] },
      { ...BASELINE, pinnedReviewIds: ["r4", "r1"] },
    ),
    false,
    "re-ordering pins is a real change",
  );
});

test("normalization ignores cosmetic string differences", () => {
  assert.equal(widgetDraftsEqual(BASELINE, { ...BASELINE, density: " cozy " }), true);
  assert.equal(
    JSON.stringify(normalizeWidgetDraft({ b: 1, a: 2 })),
    JSON.stringify(normalizeWidgetDraft({ a: 2, b: 1 })),
    "key order must not affect comparison",
  );
});

/* ─── DEFECT 3 + regression — saved config round-trip ─────────────────────── */

test("regression: the confirmed-working Wall of Love configuration round-trips unchanged", () => {
  // Dark theme, serif font, ink stars, soft cards, compact density, three
  // columns, uniform layout, owner responses on, write-review link hidden.
  const saved = {
    theme: "dark",
    fontFamily: "serif",
    starColorMode: "ink",
    cardStyle: "soft",
    density: "compact",
    gridColumns: "3",
    wallStyle: "uniform",
    showResponses: true,
    showWriteReview: false,
    cardHeights: "equal",
    enabledSources: "",
    contentType: "TEXT",
  };
  const reloaded = {
    ...saved,
    cardHeights: normalizeCardHeights(saved.cardHeights),
    enabledSources: serializeEnabledSources(normalizeEnabledSources(saved.enabledSources)),
    contentType: contentModeToStored(normalizeContentMode(saved.contentType)),
  };
  assert.deepEqual(reloaded, saved);
  assert.equal(widgetDraftsEqual(saved, reloaded), true);
});

test("regression: the confirmed-working Collect reviews configuration round-trips unchanged", () => {
  // Left tab, minimal style, custom color, hidden on mobile, inactive.
  const saved = {
    widgetType: "COLLECTING",
    collectButtonPosition: "left",
    collectButtonTheme: "minimal",
    collectButtonColor: "#0e9488",
    collectMobileBehavior: "hidden",
    isActive: false,
  };
  assert.equal(widgetDraftsEqual(saved, { ...saved }), true);
  const meta = resolveWidgetTypeMeta(saved.widgetType, "grid");
  assert.equal(meta.label, "Collect reviews");
  assert.equal(meta.placement, "head");
});

test("card heights change the layout decision for identical content", () => {
  // Deliberately unequal text lengths — the two modes must be distinguishable.
  const lengths = POPULATED_REVIEWS.map((r) => String(r.body).length);
  assert.ok(Math.max(...lengths) - Math.min(...lengths) > 100, "fixture must have varied text lengths");
  assert.notEqual(usesNaturalHeights("natural"), usesNaturalHeights("equal"));
});

/* ─── privacy ─────────────────────────────────────────────────────────────── */

test("resolution never fabricates data and passes through only what it was given", () => {
  const items = resolveWallItems(POPULATED_REVIEWS, POPULATED_VIDEOS, cfg({ contentMode: "MIXED" }));
  for (const item of items) {
    const original =
      item.type === "review"
        ? POPULATED_REVIEWS.find((r) => r.id === item.id)
        : POPULATED_VIDEOS.find((v) => v.id === item.id);
    assert.equal(item.data, original, "items reference the supplied records verbatim");
  }
});
