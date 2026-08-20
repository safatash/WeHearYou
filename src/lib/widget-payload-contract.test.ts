import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolvePublicOwnerResponse, resolveWidgetTypeMeta } from "./widget-config.ts";

/**
 * Contract tests for the public widget payload builder.
 *
 * `getPublicReviewWidgetPayload` needs a live database, so these tests cover the
 * two things that can be verified without one:
 *
 *  - the pure rules it delegates to (owner-response visibility and privacy), and
 *  - structurally, that it *does* delegate — that the payload builder has not
 *    grown its own copy of the configuration semantics the editor uses.
 */

const PAYLOAD_SRC = readFileSync(new URL("./review-widgets.ts", import.meta.url), "utf8");
const ACTIONS_SRC = readFileSync(new URL("../app/widgets/actions.ts", import.meta.url), "utf8");
const EDITOR_SRC = readFileSync(new URL("../app/widgets/widget-studio-editor.tsx", import.meta.url), "utf8");
const INDEX_SRC = readFileSync(new URL("../app/widgets/widgets-index.tsx", import.meta.url), "utf8");
const PREVIEW_SRC = readFileSync(new URL("../components/widget-mock-preview.tsx", import.meta.url), "utf8");

/* ─── Display parity: owner responses ─────────────────────────────────────── */

const publishedInternal = {
  source: "INTERNAL",
  replyDraft: "Thank you for the kind words!",
  replyPublishedAt: new Date("2026-07-01"),
  replySentAt: null,
  sourceReplyText: null,
};

const unpublishedInternal = {
  source: "INTERNAL",
  replyDraft: "Draft — do not send yet, check with legal.",
  replyPublishedAt: null,
  replySentAt: null,
  sourceReplyText: null,
};

const googleWithReply = {
  source: "GOOGLE",
  replyDraft: null,
  replyPublishedAt: null,
  replySentAt: null,
  sourceReplyText: "We appreciate the review, Dana!",
};

test("owner response is published when the toggle is on and the reply is public", () => {
  assert.equal(resolvePublicOwnerResponse(publishedInternal, true), "Thank you for the kind words!");
  assert.equal(resolvePublicOwnerResponse(googleWithReply, true), "We appreciate the review, Dana!");
});

test("owner response is omitted from the payload when the toggle is off", () => {
  assert.equal(resolvePublicOwnerResponse(publishedInternal, false), null);
  assert.equal(resolvePublicOwnerResponse(googleWithReply, false), null);
});

test("an unpublished admin draft never reaches the public payload", () => {
  assert.equal(resolvePublicOwnerResponse(unpublishedInternal, true), null);
  assert.equal(resolvePublicOwnerResponse(unpublishedInternal, false), null);
  // Explicitly: the private text must not leak under any flag combination.
  for (const show of [true, false]) {
    const out = resolvePublicOwnerResponse(unpublishedInternal, show);
    assert.ok(!String(out ?? "").includes("check with legal"));
  }
});

test("an external reply that has been sent but not published is still shown", () => {
  const sent = {
    source: "GOOGLE",
    replyDraft: "Thanks so much.",
    replyPublishedAt: null,
    replySentAt: new Date("2026-07-02"),
    sourceReplyText: null,
  };
  assert.equal(resolvePublicOwnerResponse(sent, true), "Thanks so much.");
  assert.equal(resolvePublicOwnerResponse(sent, false), null);
});

/* ─── The payload delegates rather than re-deriving ───────────────────────── */

test("the payload builder resolves items with the shared resolver", () => {
  assert.match(PAYLOAD_SRC, /resolveWallItems\(/);
  assert.match(PAYLOAD_SRC, /resolveWallEmptyState\(/);
  assert.match(PAYLOAD_SRC, /items,\n\s*emptyState,/, "payload must ship items + emptyState");
});

test("persisted config is runtime-validated before it reaches the embed", () => {
  for (const fn of [
    "normalizeCardHeights",
    "normalizeContentMode",
    "normalizeEnabledSources",
    "parsePinnedReviewIds",
    "parseReviewHighlights",
  ]) {
    assert.ok(PAYLOAD_SRC.includes(`${fn}(`), `payload must validate via ${fn}()`);
  }
  assert.match(PAYLOAD_SRC, /setInvalidWidgetValueReporter/, "malformed values must be observable");
});

test("the payload no longer hardcodes a card-height default", () => {
  assert.ok(
    !/cardHeights\?: string \}\)\.cardHeights \?\? "equal"/.test(PAYLOAD_SRC),
    "cardHeights must come from the column, not a hardcoded fallback",
  );
  assert.match(PAYLOAD_SRC, /cardHeights: normalizeCardHeights\(widget\.cardHeights\)/);
});

test("a location with no eligible reviews publishes no score", () => {
  assert.match(
    PAYLOAD_SRC,
    /avgRating: reviewCount > 0 \? \(widget\.location\.avgRating \?\? null\) : null/,
    "an unbacked average must not be published",
  );
});

test("videos are fetched for VIDEOS and MIXED, and capped", () => {
  assert.match(PAYLOAD_SRC, /contentModeIncludesVideos\(contentMode\) && isFirstPage/);
  const idx = PAYLOAD_SRC.indexOf("videoTestimonial.findMany", PAYLOAD_SRC.indexOf("contentModeIncludesVideos"));
  assert.notEqual(idx, -1);
  assert.match(PAYLOAD_SRC.slice(idx, idx + 600), /take: pageSize/, "video fetch must be bounded");
});

/* ─── The save path persists what the editor offers ───────────────────────── */

test("every setting the studio exposes is actually written", () => {
  // These were silently dropped ("field not in schema") and are the direct cause
  // of the Natural-vs-Equal and pinning defects.
  for (const field of ["cardHeights", "pinnedReviewIds", "spotlightReviewId", "reviewHighlights"]) {
    assert.ok(
      new RegExp(`^\\s*${field}: `, "m").test(ACTIONS_SRC),
      `${field} must be persisted, not commented out`,
    );
    assert.ok(
      !new RegExp(`//\\s*${field}:`).test(ACTIONS_SRC),
      `${field} must not still be commented out`,
    );
  }
});

test("a font the editor offers is a font the action accepts", () => {
  const offered = ["system", "sans", "serif", "round", "mono"];
  const allowed = ACTIONS_SRC.match(/const allowedFonts = new Set\(\[([^\]]*)\]\)/);
  assert.ok(allowed, "allowedFonts must exist");
  for (const font of offered) {
    assert.ok(allowed[1].includes(`"${font}"`), `${font} is selectable and must be accepted`);
  }
});

test("saved values are canonicalised so a reload cannot look dirty", () => {
  assert.match(ACTIONS_SRC, /enabledSources: serializeEnabledSources\(/);
  assert.match(ACTIONS_SRC, /pinnedReviewIds: serializePinnedReviewIds\(/);
  assert.match(ACTIONS_SRC, /cardHeights: normalizeCardHeights\(/);
});

/* ─── Dirty state wiring ──────────────────────────────────────────────────── */

test("the editor derives dirty state instead of latching a boolean", () => {
  assert.match(EDITOR_SRC, /const isDirty = !widgetDraftsEqual\(/);
  assert.ok(!/setIsDirty\(/.test(EDITOR_SRC), "no manual dirty flag may remain");
});

test("every control mutates through the single update path", () => {
  assert.match(EDITOR_SRC, /const update = React\.useCallback\(\(patch: Partial<WidgetDraft>\)/);
  // The old fan-out of ~50 independent useState config hooks is what let
  // controls change the preview without registering as a change.
  const configHooks = EDITOR_SRC.match(/const \[show[A-Z]\w*, setShow\w*\] = useState/g) ?? [];
  assert.equal(configHooks.length, 0, "display toggles must live in the draft, not local state");
});

test("the redirect-based save path resets the button instead of pinning it to Saved", () => {
  // updateReviewWidget ends in redirect(); treating that as terminal left
  // saveState === "saved" forever, so "Unsaved changes" could never reappear.
  assert.match(EDITOR_SRC, /if \(isRedirectError\(e\)\) \{\s*\n\s*onSaved\(\);/);
  assert.match(EDITOR_SRC, /setSaveState\("idle"\)/);
  assert.ok(!/setSaveState\("saved"\)/.test(EDITOR_SRC), "there is no sticky 'saved' state any more");
});

test("save failure keeps the draft and surfaces an actionable error", () => {
  assert.match(EDITOR_SRC, /setSaveState\("error"\)/);
  assert.match(EDITOR_SRC, /setSaveError\(/);
  assert.match(EDITOR_SRC, /role="alert"/);
  // The draft is never reset on failure — `saved` only advances in onSaved().
  const onSavedCount = (EDITOR_SRC.match(/setSaved\(submitted\)/g) ?? []).length;
  assert.equal(onSavedCount, 1, "the baseline advances in exactly one place");
});

test("duplicate submissions are prevented while saving", () => {
  assert.match(EDITOR_SRC, /if \(saveState === "saving"\) return;/);
  assert.match(EDITOR_SRC, /disabled=\{saveState === "saving"/);
});

/* ─── Stale preview data ──────────────────────────────────────────────────── */

test("preview data is keyed so another location's payload can never be displayed", () => {
  // Stats are stored with the request key they belong to and read back through
  // it, so staleness is impossible by construction rather than by remembering
  // to clear state — which is how the previous location's wall used to linger.
  assert.match(EDITOR_SRC, /const statsKey = `\$\{widget\.publicToken\}:\$\{previewNonce\}`/);
  assert.match(EDITOR_SRC, /statsFor && statsFor\.key === statsKey/);
  assert.match(EDITOR_SRC, /const previewLoading = locationStats === null;/);
  assert.match(EDITOR_SRC, /\}, \[widget\.publicToken, statsKey\]\);/);
  // A failed refetch writes nothing, so the key stays unmatched and the preview
  // stays in its loading state rather than showing the old numbers.
  assert.ok(
    !/catch \{[\s\S]{0,200}setStatsFor\(/.test(EDITOR_SRC),
    "a failed fetch must not publish stats",
  );
});

test("a successful save re-reads the public config for the preview", () => {
  assert.match(EDITOR_SRC, /setPreviewNonce\(\(n\) => n \+ 1\)/);
});

test("the editor is remounted per widget so location switches reset its state", () => {
  const PAGE_SRC = readFileSync(new URL("../app/widgets/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(PAGE_SRC, /key=\{widget\.id\}/);
  assert.match(PAGE_SRC, /availableVideos=\{pickerData\.videos\}/);
});

test("the studio preview runs in live mode with this location's own content", () => {
  assert.match(EDITOR_SRC, /dataMode="live"/);
  assert.match(EDITOR_SRC, /loading=\{previewLoading \|\| locationSwitching\}/);
  assert.match(EDITOR_SRC, /realVideos=\{availableVideos\}/);
});

test("draft source filters and pins reach the preview", () => {
  const settings = EDITOR_SRC.slice(
    EDITOR_SRC.indexOf("const previewSettings"),
    EDITOR_SRC.indexOf("const typeMeta"),
  );
  assert.match(settings, /\n\s*enabledSources,/);
  assert.match(settings, /\n\s*pinnedReviewIds,/);
  assert.match(settings, /spotlightReviewId: spotlightReviewId \?\? undefined/);
});

test("the live preview preserves Facebook recommendation polarity for the shared resolver", () => {
  assert.match(PREVIEW_SRC, /recommendationType: r\.recommendationType \?\? null/);
  assert.match(PREVIEW_SRC, /resolveWallItems\(canonicalReviews, canonicalVideos, resolutionConfig\)/);
});

/* ─── Inventory metadata ──────────────────────────────────────────────────── */

test("the inventory reads labels from the shared registry, not a local map", () => {
  assert.ok(!/const TYPE_META\b/.test(INDEX_SRC), "the local label map must be gone");
  assert.match(INDEX_SRC, /resolveWidgetTypeMeta\(w\.widgetType, w\.layout\)/);
  assert.match(INDEX_SRC, /WIDGET_TYPE_REGISTRY/);
});

test("inventory, editor and embed instructions share one registry", () => {
  assert.match(EDITOR_SRC, /WIDGET_TYPE_REGISTRY\[id\]\.label/);
  assert.match(EDITOR_SRC, /hint=\{typeMeta\.placementHint\}/);
  assert.match(EDITOR_SRC, /typeMeta\.placement === "head"/);
});

test("Collect reviews metadata is correct end to end", () => {
  const meta = resolveWidgetTypeMeta("COLLECTING", "grid");
  assert.equal(meta.label, "Collect reviews");
  assert.equal(meta.placement, "head");
  assert.match(meta.placementHint, /head/);
  // A Wall of Love keeps the mount-element guidance.
  const wall = resolveWidgetTypeMeta("WALL_OF_LOVE", "masonry");
  assert.equal(wall.label, "Wall of Love");
  assert.equal(wall.placement, "mount");
  assert.notEqual(wall.placementHint, meta.placementHint);
});
