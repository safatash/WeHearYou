import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolveEmbedRenderKind, embedShowsAiSummary, isKnownWidgetType } from "./widget-embed.ts";

test("Single Testimonial resolves to single, not badge", () => {
  assert.equal(resolveEmbedRenderKind("SINGLE_TESTIMONIAL", "grid"), "single");
  assert.equal(resolveEmbedRenderKind("SINGLE_TESTIMONIAL", "badge"), "single"); // type wins over layout
  assert.equal(resolveEmbedRenderKind("SINGLE_TESTIMONIAL", null), "single");
});

test("Single Testimonial casing / slug variants all resolve to single", () => {
  for (const v of ["single_testimonial", "single-testimonial", "single testimonial", "Single Testimonial", "testimonial", "TESTIMONIAL"]) {
    assert.equal(resolveEmbedRenderKind(v, null), "single", `widgetType="${v}"`);
  }
  for (const v of ["single", "single-testimonial", "single testimonial", "testimonial"]) {
    assert.equal(resolveEmbedRenderKind(null, v), "single", `layout="${v}"`);
  }
});

test("Badge widgets still resolve to badge", () => {
  assert.equal(resolveEmbedRenderKind("BADGE", "badge"), "badge");
  assert.equal(resolveEmbedRenderKind("BADGE", null), "badge");
  assert.equal(resolveEmbedRenderKind(null, "badge"), "badge");
  assert.equal(resolveEmbedRenderKind("badge", null), "badge");
});

test("Collecting and Floating resolve correctly", () => {
  assert.equal(resolveEmbedRenderKind("COLLECTING", "grid"), "collecting");
  assert.equal(resolveEmbedRenderKind("FLOATING", "floating"), "floating");
  assert.equal(resolveEmbedRenderKind(null, "floating"), "floating");
});

test("Wall of Love / review layouts resolve to list", () => {
  for (const l of ["masonry", "carousel", "grid", "list", "slider", "video-grid"]) {
    assert.equal(resolveEmbedRenderKind("WALL_OF_LOVE", l), "list", `layout="${l}"`);
  }
});

test("Unknown widgets fall back to list, never badge", () => {
  assert.equal(resolveEmbedRenderKind("SOMETHING_NEW", "weird-layout"), "list");
  assert.equal(resolveEmbedRenderKind("", ""), "list");
  assert.equal(resolveEmbedRenderKind(null, null), "list");
  assert.equal(resolveEmbedRenderKind(undefined, undefined), "list");
});

test("isKnownWidgetType recognizes the supported types and flags unknown ones", () => {
  for (const t of ["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING", "FLOATING", "single-testimonial", "wall of love", ""]) {
    assert.equal(isKnownWidgetType(t), true, `"${t}" should be known`);
  }
  for (const t of ["CAROUSEL_WIDGET", "SOMETHING_NEW", "wall_of_love_v2"]) {
    assert.equal(isKnownWidgetType(t), false, `"${t}" should be unknown`);
  }
});

test("embed script does not render the internal widget name/title", () => {
  const src = readFileSync(new URL("../app/embed/widget.js/route.ts", import.meta.url), "utf8");
  // The widget.name is an internal admin label; it must not be emitted into the
  // public embed markup. After the fix the embed script references neither the
  // name nor a titleHtml heading built from it.
  assert.equal(/data\.widget\.name/.test(src), false, "embed must not reference data.widget.name");
  assert.equal(/titleHtml/.test(src), false, "embed must not build a title from the widget name");
});

test("embedShowsAiSummary only true when a non-empty summary exists", () => {
  assert.equal(embedShowsAiSummary("Customers love the staff."), true);
  assert.equal(embedShowsAiSummary(""), false);
  assert.equal(embedShowsAiSummary("   "), false);
  assert.equal(embedShowsAiSummary(null), false);
  assert.equal(embedShowsAiSummary(undefined), false);
});
