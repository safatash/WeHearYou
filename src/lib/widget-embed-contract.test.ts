import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * Contract tests for the public embed script.
 *
 * `src/app/embed/widget.js/route.ts` serves a plain-JS string to third-party
 * sites, so it cannot import the shared TypeScript module directly. These tests
 * close that gap two ways:
 *
 *  1. by *executing* self-contained embed functions in a stubbed DOM, and
 *  2. by asserting structurally that the embed defers configuration semantics
 *     to the server-resolved payload instead of re-deriving them.
 */

const ROUTE_SRC = readFileSync(new URL("../app/embed/widget.js/route.ts", import.meta.url), "utf8");

/**
 * The exact JavaScript the route serves to third-party sites. The route body is
 * a template literal with no interpolation, so evaluating it here resolves the
 * same escapes the module would and gives us the real shipped script.
 */
const EMBED_SRC: string = (() => {
  const open = ROUTE_SRC.indexOf("const script = `");
  const raw = ROUTE_SRC.slice(open + "const script = `".length, ROUTE_SRC.lastIndexOf("`;"));
  assert.ok(!raw.includes("${"), "embed template must stay interpolation-free");
  return new Function("return `" + raw + "`")() as string;
})();

/** Pull one top-level `function name(...) { ... }` out of the embed source. */
function extractFunction(name: string): string {
  const header = `function ${name}(`;
  const start = EMBED_SRC.indexOf(header);
  assert.notEqual(start, -1, `embed must define ${name}()`);
  const open = EMBED_SRC.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < EMBED_SRC.length; i++) {
    if (EMBED_SRC[i] === "{") depth++;
    else if (EMBED_SRC[i] === "}") {
      depth--;
      if (depth === 0) return EMBED_SRC.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

/* ─── Collect reviews: mobile behaviour (executed) ────────────────────────── */

type FakeButton = {
  className: string;
  style: { cssText: string };
  textContent: string;
  classList: { add: (...c: string[]) => void };
  setAttribute: (k: string, v: string) => void;
  addEventListener: () => void;
  _classes: string[];
};

/**
 * Run the real `renderCollectingWidget` against a stubbed DOM at a given
 * viewport width and return the button it appended, or null if it suppressed
 * itself.
 */
function runCollectingWidget(widgetConfig: Record<string, unknown>, innerWidth: number): FakeButton | null {
  const appended: FakeButton[] = [];
  const makeButton = (): FakeButton => {
    const classes: string[] = [];
    return {
      className: "",
      style: { cssText: "" },
      textContent: "",
      _classes: classes,
      classList: { add: (...c: string[]) => classes.push(...c) },
      setAttribute: () => {},
      addEventListener: () => {},
    };
  };

  const sandbox = new Function(
    "makeButton",
    "appended",
    "innerWidth",
    `
    var window = { innerWidth: innerWidth };
    var document = {
      createElement: function () { return makeButton(); },
      body: { appendChild: function (el) { appended.push(el); } },
      getElementById: function () { return null; }
    };
    function shouldShowCollect() { return true; }
    function ensureCollectStyles() {}
    function openCollectModal() {}
    ${extractFunction("renderCollectingWidget")}
    return renderCollectingWidget;
    `,
  )(makeButton, appended, innerWidth);

  sandbox({ widget: widgetConfig, location: { slug: "acme" } }, "tok", "https://app.example");
  return appended[0] ?? null;
}

const MOBILE = 390;
const DESKTOP = 1280;

test("collect reviews: hidden-mobile suppresses the button at a mobile viewport", () => {
  const btn = runCollectingWidget({ collectMobileBehavior: "hidden", collectButtonPosition: "left" }, MOBILE);
  assert.equal(btn, null, "no button may be appended on mobile when hidden");
});

test("collect reviews: hidden-mobile still renders on desktop", () => {
  const btn = runCollectingWidget({ collectMobileBehavior: "hidden", collectButtonPosition: "left" }, DESKTOP);
  assert.notEqual(btn, null);
});

test("collect reviews: show-on-mobile renders at a mobile viewport", () => {
  const btn = runCollectingWidget({ collectMobileBehavior: "pill", collectButtonPosition: "left" }, MOBILE);
  assert.notEqual(btn, null);
});

test("collect reviews: left-tab position and minimal style survive to the DOM", () => {
  const btn = runCollectingWidget(
    {
      collectMobileBehavior: "pill",
      collectButtonPosition: "left",
      collectButtonTheme: "minimal",
      collectButtonColor: "#0e9488",
    },
    DESKTOP,
  );
  assert.ok(btn);
  assert.ok(btn._classes.includes("why-collect-tab"), "left/right position must render as a tab");
  assert.ok(btn._classes.includes("why-collect-tab-l"), "left tab class");
  // Minimal = outlined in the custom colour, not a filled button.
  assert.match(btn.style.cssText, /background:transparent/);
  assert.match(btn.style.cssText, /#0e9488/);
});

test("collect reviews: custom colour beats the widget accent, default style is filled", () => {
  const btn = runCollectingWidget(
    { collectMobileBehavior: "pill", collectButtonPosition: "bottom-right", collectButtonTheme: "default", collectButtonColor: "#0e9488", primaryColor: "#4338ca" },
    DESKTOP,
  );
  assert.ok(btn);
  assert.ok(btn._classes.includes("why-collect-pill-br"));
  assert.match(btn.style.cssText, /background:#0e9488/);
  assert.ok(!btn.style.cssText.includes("#4338ca"), "custom colour must win over primaryColor");
});

/* ─── Wall of Love: the embed defers to the resolved payload ──────────────── */

test("embed renders the server-resolved item list rather than re-deriving it", () => {
  assert.match(EMBED_SRC, /var items = data\.items \|\| \[\]/, "embed must consume data.items");
  // The old client-side assembly re-implemented content-mode semantics; it must
  // be gone or MIXED can silently drop videos again.
  assert.ok(
    !/data\.widget\.contentType === "MIXED"[\s\S]{0,400}concat\(/.test(EMBED_SRC),
    "embed must not re-assemble MIXED content client-side",
  );
});

test("embed no longer re-applies source filtering client-side", () => {
  assert.ok(
    !/var enabledSrcList = /.test(EMBED_SRC),
    "source filtering is applied server-side by resolveWallItems",
  );
});

test("embed reads the resolver's spotlight and pinned markers", () => {
  assert.match(EMBED_SRC, /it\.spotlight === true/, "spotlight comes from the resolved item");
  assert.match(EMBED_SRC, /if \(!item\.pinned\) return html/, "pinned items get a render marker");
  assert.match(EMBED_SRC, /why-widget-card-pinned/, "pinned marker class must exist");
  assert.match(EMBED_SRC, /\.why-widget-card-pinned::before\{content:'Pinned'/, "pinned emphasis must be visible");
});

/* ─── Card heights ────────────────────────────────────────────────────────── */

test("card heights map to the right layout and are not inverted", () => {
  const block = EMBED_SRC.slice(
    EMBED_SRC.indexOf("var isNaturalHeights"),
    EMBED_SRC.indexOf("For mixed-masonry"),
  );
  assert.match(block, /var isNaturalHeights = data\.widget\.cardHeights === "natural"/);

  const split = block.indexOf("// Equal = CSS grid");
  assert.notEqual(split, -1, "the equal branch must be identifiable");
  const naturalBranch = block.slice(0, split);
  const equalBranch = block.slice(split);
  // natural ⇒ CSS multi-column (content-driven heights), never a fixed grid.
  assert.match(naturalBranch, /container\.style\.columns = /);
  assert.ok(!/gridTemplateColumns = "repeat/.test(naturalBranch), "natural must not build a fixed grid");
  // equal ⇒ CSS grid with stretched rows, never CSS columns.
  assert.match(equalBranch, /container\.style\.display = "grid"/);
  assert.match(equalBranch, /alignItems = "stretch"/);
  assert.match(equalBranch, /container\.style\.columns = ""/);
});

/* ─── Quote highlights ────────────────────────────────────────────────────── */

test("highlight support is layout-independent, not just the varied grid", () => {
  // renderCard() serves uniform walls, lists, sliders and carousels. It used to
  // emit escapeHtml(body) with no <mark>, so highlights only ever worked in the
  // varied grid.
  const renderCard = extractFunction("renderCard");
  assert.match(renderCard, /highlightedTextHtml\(body, activeHighlights\[review\.id\]/);
  assert.ok(!/why-widget-body[^]*?escapeHtml\(body\)\s*\+/.test(renderCard), "the body must go through the highlighter");
});

test("there is one highlight implementation in the embed", () => {
  assert.equal((EMBED_SRC.match(/function highlightedTextHtml\(/g) ?? []).length, 1);
  assert.match(EMBED_SRC, /var highlightMap = activeHighlights;/, "the grid path reuses the shared map");
  // The old duplicate parse/slice implementation must be gone.
  assert.ok(!/highlights\.forEach\(function\(h\)/.test(EMBED_SRC));
});

test("the highlight map is built before any card renders", () => {
  const items = EMBED_SRC.indexOf("var items = data.items || []");
  const build = EMBED_SRC.indexOf("activeHighlights = parseHighlightMap");
  assert.notEqual(build, -1);
  assert.ok(build > items && build - items < 200, "map must be populated up-front");
});

test("malformed highlight data cannot throw in the embed", () => {
  const parse = extractFunction("parseHighlightMap");
  assert.match(parse, /try \{/);
  assert.match(parse, /catch \(e\) \{\}/);
  assert.match(parse, /\[object Array\]/, "non-array JSON must be rejected");
});

test("a phrase that is absent from the body renders plain text", () => {
  const fn = extractFunction("highlightedTextHtml");
  assert.match(fn, /if \(idx === -1\) return escapeHtml\(text\);/);
});

/* ─── Video cards ─────────────────────────────────────────────────────────── */

test("the video card renders the caption the payload carries", () => {
  // The caption was in the payload and shown in the editor preview, but the
  // embed dropped it — thumbnail + name only.
  const fn = extractFunction("renderVideoCard");
  assert.match(fn, /var caption = \(vt\.caption \|\| ""\)\.trim\(\)/);
  assert.match(fn, /why-video-caption/);
  assert.match(fn, /escapeHtml\(caption\)/, "the caption must be escaped into the card");
});

test("the video card honours the display flags, like review cards do", () => {
  const fn = extractFunction("renderVideoCard");
  assert.match(fn, /w\.showReviewerName !== false/);
  assert.match(fn, /w\.showDate && vt\.publishedAt/);
  assert.match(fn, /w\.showSourceLogo/);
});

test("video cards invent no star rating", () => {
  // VideoTestimonial has no rating column; stars here would be fabricated.
  const fn = extractFunction("renderVideoCard");
  assert.ok(!/stars\(/.test(fn), "no star markup may be produced for a video");
});

test("every video card call site passes the widget config", () => {
  const calls = EMBED_SRC.match(/renderVideoCard\([^)]*\)/g) ?? [];
  const invocations = calls.filter((c) => !c.startsWith("renderVideoCard(vt"));
  assert.ok(invocations.length >= 4, `expected several call sites, saw ${invocations.length}`);
  for (const call of invocations) {
    assert.match(call, /,\s*(w|data\.widget)\)/, `call site must pass config: ${call}`);
  }
});

/* ─── Body text limit ─────────────────────────────────────────────────────── */

test("bodyMaxChars is applied to public wall cards", () => {
  // Previously truncate() existed but was only wired to the floating widget, so
  // the editor's text-limit slider had no public effect — and the preview and
  // embed matched highlight phrases against different text.
  const uses = EMBED_SRC.match(/truncate\([^)]*bodyMaxChars\)/g) ?? [];
  assert.ok(uses.length >= 4, `expected every wall card path to truncate, saw ${uses.length}`);
  assert.match(extractFunction("renderCard"), /truncate\(review\.body \|\| '', widget\.bodyMaxChars\)/);
});

/* ─── Empty state ─────────────────────────────────────────────────────────── */

test("zero items renders an explicit empty state, not a blank frame", () => {
  assert.match(EMBED_SRC, /items\.length === 0/);
  assert.match(EMBED_SRC, /why-widget-empty/);
  assert.match(EMBED_SRC, /data-empty-category/, "category must be exposed for parity checks");
  assert.match(EMBED_SRC, /data\.emptyState/, "category comes from the server resolver");
});

test("the wall renderer is skipped entirely when there is nothing to show", () => {
  assert.match(EMBED_SRC, /if \(container && items\.length > 0\) \{/);
});

test("an empty wall shows no Load more affordance", () => {
  const idx = EMBED_SRC.indexOf("loadMoreButton && items.length > 0");
  assert.notEqual(idx, -1, "Load more must be gated on having items");
  assert.match(EMBED_SRC.slice(idx, idx + 120), /data\.pagination\.hasMore/);
});

/* ─── Display parity ──────────────────────────────────────────────────────── */

test("write-review link visibility follows the saved config", () => {
  assert.match(
    EMBED_SRC,
    /if \(data\.widget\.showWriteReview && data\.location\.reviewLink/,
    "the link renders only when the saved flag is on and a link exists",
  );
});

test("owner responses are gated on the saved showResponses flag", () => {
  assert.match(EMBED_SRC, /showResponses/, "embed must consult showResponses");
});

test("the header suppresses score and count when there is nothing behind them", () => {
  assert.match(EMBED_SRC, /data\.widget\.showAvgRating && rating/);
  assert.match(EMBED_SRC, /data\.widget\.showReviewCount && data\.location\.reviewCount/);
});

/* ─── Structural safety ───────────────────────────────────────────────────── */

test("the served embed script is syntactically valid JavaScript", () => {
  assert.ok(EMBED_SRC.length > 1000, "embed body should be substantial");
  // Throws a SyntaxError if the served script is ever broken — including by a
  // stray backtick inside a comment, which silently truncates the template.
  assert.doesNotThrow(() => new Function(EMBED_SRC));
});
