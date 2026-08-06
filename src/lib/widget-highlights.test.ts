import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  normalizeReviewHighlights,
  parseReviewHighlights,
  serializeReviewHighlights,
  resolveHighlightStatus,
  resolveCardBody,
  DEFAULT_BODY_MAX_CHARS,
  normalizeWidgetDraft,
  widgetDraftsEqual,
  type ReviewHighlight,
} from "./widget-config.ts";

/**
 * Quote highlights: add / edit / remove / reload / public API / fresh embed.
 *
 * The defect was at the editor-draft-to-persistence boundary — the typed phrase
 * lived in component-local state and never reached the draft that Save submits,
 * so a valid highlight serialized to "". These tests pin the whole round trip.
 */

const EDITOR_SRC = readFileSync(new URL("../app/widgets/widget-studio-editor.tsx", import.meta.url), "utf8");
const ACTIONS_SRC = readFileSync(new URL("../app/widgets/actions.ts", import.meta.url), "utf8");
const PAYLOAD_SRC = readFileSync(new URL("./review-widgets.ts", import.meta.url), "utf8");

/* ─── fixtures ────────────────────────────────────────────────────────────── */

const REVIEW_BODIES: Record<string, string> = {
  r1:
    "I cannot say enough good things about this crew. They arrived early, walked me through every " +
    "option without any pressure, and stayed late to make sure the finish matched the rest of the house.",
  r2: "Friendly team and the work was finished on time. Would use again.",
  r3: "Great.",
};

const PHRASE_R1 = "stayed late to make sure the finish matched";
const PHRASE_R2 = "finished on time";

/** Stand-in for the editor draft round trip: draft → FormData → server → row. */
function saveAndReload(draftHighlights: readonly unknown[]): ReviewHighlight[] {
  // Editor serializes the draft into FormData…
  const formValue = serializeReviewHighlights(draftHighlights);
  // …the server action validates and stores…
  const stored = serializeReviewHighlights(parseReviewHighlights(formValue));
  // …and the editor reloads from the stored column.
  return parseReviewHighlights(stored);
}

/* ─── canonical contract ──────────────────────────────────────────────────── */

test("a highlight is exactly { reviewId, quote }", () => {
  const [h] = normalizeReviewHighlights([{ reviewId: "r1", quote: PHRASE_R1, extra: "ignored" }]);
  assert.deepEqual(Object.keys(h).sort(), ["quote", "reviewId"]);
  assert.equal(h.reviewId, "r1");
  assert.equal(h.quote, PHRASE_R1);
});

test("quotes are trimmed and blank entries dropped", () => {
  assert.deepEqual(normalizeReviewHighlights([{ reviewId: "r1", quote: `  ${PHRASE_R1}  ` }]), [
    { reviewId: "r1", quote: PHRASE_R1 },
  ]);
  assert.deepEqual(normalizeReviewHighlights([{ reviewId: "r1", quote: "   " }]), []);
  assert.deepEqual(normalizeReviewHighlights([{ reviewId: "  ", quote: "x" }]), []);
});

test("highlights de-duplicate by review id, first wins", () => {
  assert.deepEqual(
    normalizeReviewHighlights([
      { reviewId: "r1", quote: "first" },
      { reviewId: "r1", quote: "second" },
    ]),
    [{ reviewId: "r1", quote: "first" }],
  );
});

/* ─── add / edit / remove / reload ────────────────────────────────────────── */

test("adding a highlight survives save and reload", () => {
  const reloaded = saveAndReload([{ reviewId: "r1", quote: PHRASE_R1 }]);
  assert.deepEqual(reloaded, [{ reviewId: "r1", quote: PHRASE_R1 }]);
});

test("editing one highlight changes only that record", () => {
  const before = [
    { reviewId: "r1", quote: PHRASE_R1 },
    { reviewId: "r2", quote: PHRASE_R2 },
  ];
  const edited = before.map((h) => (h.reviewId === "r1" ? { ...h, quote: "walked me through every" } : h));
  const reloaded = saveAndReload(edited);
  assert.deepEqual(reloaded, [
    { reviewId: "r1", quote: "walked me through every" },
    { reviewId: "r2", quote: PHRASE_R2 },
  ]);
});

test("removing one highlight leaves the others intact", () => {
  const before = [
    { reviewId: "r1", quote: PHRASE_R1 },
    { reviewId: "r2", quote: PHRASE_R2 },
  ];
  const reloaded = saveAndReload(before.filter((h) => h.reviewId !== "r1"));
  assert.deepEqual(reloaded, [{ reviewId: "r2", quote: PHRASE_R2 }]);
});

test("multiple highlights persist independently across repeated saves", () => {
  let state: ReviewHighlight[] = saveAndReload([{ reviewId: "r1", quote: PHRASE_R1 }]);
  state = saveAndReload([...state, { reviewId: "r2", quote: PHRASE_R2 }]);
  state = saveAndReload([...state, { reviewId: "r3", quote: "Great." }]);
  assert.equal(state.length, 3);
  assert.deepEqual(state.map((h) => h.reviewId), ["r1", "r2", "r3"]);
  // A fourth round trip must be a fixed point.
  assert.deepEqual(saveAndReload(state), state);
});

test("an unfinished row (no phrase yet) is not persisted, and does not erase the rest", () => {
  const reloaded = saveAndReload([
    { reviewId: "r1", quote: PHRASE_R1 },
    { reviewId: "r2", quote: "" },
  ]);
  assert.deepEqual(reloaded, [{ reviewId: "r1", quote: PHRASE_R1 }]);
});

/* ─── the regression itself ───────────────────────────────────────────────── */

test("a valid highlight never serializes to the empty string", () => {
  const serialized = serializeReviewHighlights([{ reviewId: "r1", quote: PHRASE_R1 }]);
  assert.notEqual(serialized, "", "this exact coercion was the reported defect");
  assert.equal(serialized, JSON.stringify([{ reviewId: "r1", quote: PHRASE_R1 }]));
});

test("adding or editing a highlight marks the editor dirty", () => {
  const baseline = { reviewHighlights: [] as ReviewHighlight[] };
  const added = { reviewHighlights: [{ reviewId: "r1", quote: PHRASE_R1 }] };
  assert.equal(widgetDraftsEqual(baseline, added), false, "adding must mark dirty");

  const edited = { reviewHighlights: [{ reviewId: "r1", quote: "walked me through every" }] };
  assert.equal(widgetDraftsEqual(added, edited), false, "editing must mark dirty");
  assert.equal(widgetDraftsEqual(added, { reviewHighlights: [] }), false, "removing must mark dirty");
});

test("an unfinished row alone does not falsely mark the editor dirty", () => {
  // Clicking "+ Highlight" and typing nothing changes nothing that can be saved.
  assert.equal(
    widgetDraftsEqual({ reviewHighlights: [] }, { reviewHighlights: [{ reviewId: "r1", quote: "" }] }),
    true,
  );
});

test("reverting a highlight edit returns the editor to clean", () => {
  const saved = { reviewHighlights: [{ reviewId: "r1", quote: PHRASE_R1 }] };
  const touched = { reviewHighlights: [{ reviewId: "r1", quote: "something else" }] };
  assert.equal(widgetDraftsEqual(saved, touched), false);
  assert.equal(widgetDraftsEqual(saved, { reviewHighlights: [{ reviewId: "r1", quote: PHRASE_R1 }] }), true);
  // Whitespace-only differences are not semantic changes.
  assert.equal(widgetDraftsEqual(saved, { reviewHighlights: [{ reviewId: "r1", quote: ` ${PHRASE_R1} ` }] }), true);
});

test("normalized draft comparison is stable for highlights in any input shape", () => {
  const asArray = normalizeWidgetDraft({ reviewHighlights: [{ reviewId: "r1", quote: PHRASE_R1 }] });
  const asJson = normalizeWidgetDraft({ reviewHighlights: JSON.stringify([{ reviewId: "r1", quote: PHRASE_R1 }]) });
  assert.deepEqual(asArray, asJson, "draft array and stored JSON must compare equal");
});

/* ─── malformed data fails safe ───────────────────────────────────────────── */

test("malformed persisted highlight data does not crash and does not invent records", () => {
  for (const bad of ["{not json", "null", '"a string"', "42", "[", '{"reviewId":"r1"}']) {
    assert.deepEqual(parseReviewHighlights(bad), [], `input: ${bad}`);
  }
  assert.deepEqual(parseReviewHighlights(""), []);
  assert.deepEqual(parseReviewHighlights(null), []);
});

test("one invalid record does not discard the valid ones", () => {
  const mixed = JSON.stringify([
    { reviewId: "r1", quote: PHRASE_R1 },
    { reviewId: 42, quote: "wrong type" },
    null,
    { quote: "no id" },
    { reviewId: "r2", quote: PHRASE_R2 },
  ]);
  assert.deepEqual(parseReviewHighlights(mixed), [
    { reviewId: "r1", quote: PHRASE_R1 },
    { reviewId: "r2", quote: PHRASE_R2 },
  ]);
});

/* ─── status: phrase no longer matches ────────────────────────────────────── */

test("a phrase present in the rendered body is active", () => {
  const body = resolveCardBody(REVIEW_BODIES.r1, 600);
  assert.equal(resolveHighlightStatus({ reviewId: "r1", quote: PHRASE_R1 }, body), "active");
});

test("a phrase that no longer matches reports phrase_not_found but is kept", () => {
  const body = resolveCardBody(REVIEW_BODIES.r2, 600);
  assert.equal(resolveHighlightStatus({ reviewId: "r2", quote: "a phrase that was edited away" }, body), "phrase_not_found");
  // Crucially, the record survives the round trip untouched.
  const reloaded = saveAndReload([
    { reviewId: "r2", quote: "a phrase that was edited away" },
    { reviewId: "r1", quote: PHRASE_R1 },
  ]);
  assert.equal(reloaded.length, 2, "a non-matching phrase must not erase anything");
  assert.equal(reloaded[0].quote, "a phrase that was edited away");
});

test("a missing review reports review_unavailable rather than throwing", () => {
  assert.equal(resolveHighlightStatus({ reviewId: "gone", quote: "x" }, null), "review_unavailable");
  assert.equal(resolveHighlightStatus({ reviewId: "gone", quote: "x" }, undefined), "review_unavailable");
});

/* ─── body truncation parity (highlights match the *rendered* text) ───────── */

test("card body truncation is shared and deterministic", () => {
  assert.equal(resolveCardBody("short", 280), "short");
  assert.equal(resolveCardBody(null, 280), "");
  assert.equal(DEFAULT_BODY_MAX_CHARS, 280);
  const long = "x".repeat(400);
  const cut = resolveCardBody(long, 100);
  assert.ok(cut.length <= 101, `got ${cut.length}`);
  assert.ok(cut.endsWith("…"));
});

test("a phrase past the text limit is reported as not found, consistently", () => {
  // The phrase exists in the raw body but not in what the card renders — the
  // editor must say so rather than showing a highlight the visitor never sees.
  const tail = "matched the rest of the house";
  assert.ok(REVIEW_BODIES.r1.includes(tail));
  const rendered = resolveCardBody(REVIEW_BODIES.r1, 60);
  assert.ok(!rendered.includes(tail));
  assert.equal(resolveHighlightStatus({ reviewId: "r1", quote: tail }, rendered), "phrase_not_found");
});

/* ─── wiring: the draft is the only source of truth ───────────────────────── */

test("the highlight textarea writes straight into the widget draft", () => {
  assert.match(
    EDITOR_SRC,
    /onChange=\{\(e\) => updateReviewHighlightQuote\(h\.reviewId, e\.target\.value\)\}/,
    "the phrase must land in the draft on every keystroke",
  );
  assert.match(EDITOR_SRC, /value=\{h\.quote\}/, "the textarea must be bound to the draft record");
  // The local buffer that swallowed the phrase must be gone.
  assert.ok(!/highlightEditText/.test(EDITOR_SRC), "no component-local text buffer may remain");
});

test("add, edit and remove all go through the draft state path", () => {
  for (const fn of ["addReviewHighlight", "updateReviewHighlightQuote", "removeReviewHighlight"]) {
    assert.ok(EDITOR_SRC.includes(`const ${fn} =`), `${fn} must exist`);
  }
  assert.match(EDITOR_SRC, /const closeReviewHighlightEditor = /, "closing must clean up blank rows");
  assert.match(EDITOR_SRC, /h\.reviewId !== reviewId \|\| h\.quote\.trim\(\) !== ""/);
});

test("the editor surfaces a non-matching phrase instead of failing silently", () => {
  assert.match(EDITOR_SRC, /resolveHighlightStatus\(/);
  assert.match(EDITOR_SRC, /resolveCardBody\(r\.body, bodyMaxChars\)/, "status must use the rendered body");
  assert.match(EDITOR_SRC, /data-highlight-status="phrase_not_found"/);
  assert.match(EDITOR_SRC, /data-highlight-status="review_unavailable"/);
});

test("the server keeps valid records instead of coercing the field to empty", () => {
  assert.match(ACTIONS_SRC, /reviewHighlights: serializeReviewHighlights\(parseReviewHighlights\(rawReviewHighlights\)\)/);
  assert.ok(
    !/try \{ JSON\.parse\(raw\); return raw; \} catch \{ return ""; \}/.test(ACTIONS_SRC),
    "the all-or-nothing JSON pre-coercion must be gone",
  );
});

test("the public payload serializes highlights through the shared normalizer", () => {
  assert.match(PAYLOAD_SRC, /reviewHighlights: serializeReviewHighlights\(parseReviewHighlights\(widget\.reviewHighlights\)\)/);
});

/* ─── owner responses are never invented in the live preview ──────────────── */

test("the preview renders a review's real owner reply, or none", () => {
  const PREVIEW_SRC = readFileSync(new URL("../components/widget-mock-preview.tsx", import.meta.url), "utf8");
  assert.match(PREVIEW_SRC, /const ownerReply = r\.ownerReply \?\? null;/);
  assert.match(PREVIEW_SRC, /const singleReply = r\.ownerReply \?\? null;/);
  assert.match(PREVIEW_SRC, /\{s\.showResponses && ownerReply && \(/);
  assert.match(PREVIEW_SRC, /\{s\.showResponses && singleReply && \(/);
  // The hardcoded reply may only survive inside the documented sample fixture.
  const fabricated = PREVIEW_SRC.match(/Thank you so much for your kind words/g) ?? [];
  assert.equal(fabricated.length, 1, "only the sample fixture may carry a canned reply");
  assert.match(PREVIEW_SRC, /source: "Facebook", ownerReply: "Thank you so much/);
});

test("the editor's preview feed carries real replies under the publish rule", () => {
  assert.match(PAYLOAD_SRC, /ownerReply: resolvePublicOwnerResponse\(r, true\)/);
});
