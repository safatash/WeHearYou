/**
 * Browser-level verification of the public widget embed.
 *
 * Loads the *actual* script served by /embed/widget.js into a real Chromium
 * page and renders it against crafted public-API payloads, then inspects the
 * resulting DOM and computed CSS.
 *
 * The payloads are produced by the same `resolveWallItems` /
 * `resolveWallEmptyState` functions the live API uses, so this exercises the
 * whole editor→config→API→embed contract end to end without touching any
 * customer data or the production database.
 *
 *   node scripts/verify-widget-embed-render.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register(pathToFileURL(path.join(ROOT, "test-loader.mjs")).href, { parentURL: pathToFileURL(ROOT + "/") });

const { resolveWallItems, resolveWallEmptyState } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/widget-config.ts")).href
);

/* ─── the real embed script ───────────────────────────────────────────────── */

const routeSrc = readFileSync(path.join(ROOT, "src/app/embed/widget.js/route.ts"), "utf8");
const rawTemplate = routeSrc.slice(
  routeSrc.indexOf("const script = `") + "const script = `".length,
  routeSrc.lastIndexOf("`;"),
);
// The route body is an interpolation-free template literal; evaluating it here
// yields byte-for-byte what the CDN serves.
const EMBED_JS = new Function("return `" + rawTemplate + "`")();

/* ─── fixtures ────────────────────────────────────────────────────────────── */

const SHORT = "Great.";
const LONG =
  "I cannot say enough good things about this crew. They arrived early, walked me through every option " +
  "without any pressure, and stayed late to make sure the finish matched the rest of the house. Six weeks " +
  "on it still looks exactly like the day they left, and the follow-up call to check in was a genuinely " +
  "nice touch that I did not expect from a contractor at this price point.";

const POPULATED_REVIEWS = [
  { id: "r1", reviewerName: "Dana", reviewerPhotoUrl: null, sourceReviewUrl: null, sourceReplyText: null, rating: 5, body: LONG, reviewedAt: "2026-07-01T00:00:00.000Z", source: "GOOGLE" },
  { id: "r2", reviewerName: "Ali", reviewerPhotoUrl: null, sourceReviewUrl: null, sourceReplyText: "Thanks Ali!", rating: 4, body: SHORT, reviewedAt: "2026-06-20T00:00:00.000Z", source: "FACEBOOK" },
  { id: "r3", reviewerName: "Sam", reviewerPhotoUrl: null, sourceReviewUrl: null, sourceReplyText: null, rating: 5, body: "Friendly team, finished on time.", reviewedAt: "2026-06-10T00:00:00.000Z", source: "GOOGLE" },
  { id: "r4", reviewerName: "Robin", reviewerPhotoUrl: null, sourceReviewUrl: null, sourceReplyText: null, rating: 4, body: SHORT, reviewedAt: "2026-05-30T00:00:00.000Z", source: "YELP" },
];

const POPULATED_VIDEOS = [
  { id: "v1", submitterName: "Jules", videoUrl: "https://cdn.example/v1.mp4", durationSeconds: 42, caption: "Loved it", publishedAt: "2026-06-25T00:00:00.000Z", customThumbnailUrl: null, capturedFrameUrl: null, capturedFrameTimestamp: null, thumbnailSource: "AUTO" },
];

const BASE_WIDGET = {
  name: "Test wall", layout: "masonry", renderKind: "list", marqueeSpeed: "normal", theme: "light",
  pageSize: 12, contentType: "TEXT", widgetType: "WALL_OF_LOVE", badgeStyle: null,
  showHeader: true, showAvgRating: true, showReviewCount: true, headerAlign: "left",
  showRating: true, showReviewerName: true, showDate: true, showWriteReview: true,
  showResponses: true, showSourceLogo: true, showAiSummary: false, showBranding: true,
  showNav: true, showPagination: true, bodyMaxChars: 600,
  primaryColor: "#4338ca", starColor: "#f59e0b", backgroundColor: "#ffffff", textColor: "#18181b",
  fontFamily: "system", starColorMode: "gold", cornerRadius: 12, cardStyle: "border",
  density: "cozy", gridColumns: "2", wallStyle: "uniform", cardHeights: "equal",
  enabledSources: "", spotlightReviewId: null, pinnedReviewIds: "", reviewHighlights: "",
  fontSizeBase: 14, fontSizeNames: 13, fontSizeHeader: 20, fontSizeLabel: 12, fontSizeSummary: 14,
  collectDisplayFreq: null, collectButtonColor: null, collectButtonTheme: null,
  collectMobileBehavior: null, collectButtonPosition: null,
  floatingCardStyle: null, floatingVariation: null, floatingPosition: null,
  floatingRotationEnabled: null, floatingRotationIntervalSec: null, floatingAccentColorMode: null,
  floatingAccentColor: null, floatingMobileBehavior: null, floatingApprovedOnly: null,
  floatingMinRating: null, floatingDisplayFrequency: null,
};

/** Build a payload exactly the way getPublicReviewWidgetPayload does. */
function buildPayload({ widget = {}, reviews = POPULATED_REVIEWS, videos = POPULATED_VIDEOS, locationName = "Acme Cabinets" } = {}) {
  const w = { ...BASE_WIDGET, ...widget };
  const contentMode = w.contentType === "VIDEO" ? "VIDEOS" : w.contentType === "MIXED" ? "MIXED" : "REVIEWS";
  const config = {
    contentMode,
    enabledSources: w.enabledSources ? w.enabledSources.split(",") : ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"],
    minRating: 1,
    pageSize: w.pageSize,
    pinnedReviewIds: w.pinnedReviewIds ? w.pinnedReviewIds.split(",") : [],
    spotlightReviewId: w.spotlightReviewId,
    applyPriority: true,
  };
  const items = resolveWallItems(reviews, contentMode === "REVIEWS" ? [] : videos, config);
  const renderedReviews = items.filter((i) => i.type === "review").map((i) => i.data);
  return {
    widget: w,
    location: {
      name: locationName,
      slug: "acme",
      avgRating: reviews.length > 0 ? 4.8 : null,
      reviewCount: reviews.length,
      reviewLink: "https://g.page/acme/review",
      aiReviewSummary: null,
      aiReviewSummaryReviewCount: null,
    },
    reviews: renderedReviews,
    items,
    emptyState: resolveWallEmptyState(items.length, config),
    pagination: { page: 1, pageSize: w.pageSize, total: reviews.length, hasMore: false },
    ...(items.some((i) => i.type === "video") ? { videoTestimonials: videos } : {}),
  };
}

/* ─── harness ─────────────────────────────────────────────────────────────── */

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Render a payload with the real embed script and hand the page to `fn`. */
async function render(browser, payload, fn, { viewport = { width: 1200, height: 900 }, mount = true } = {}) {
  const page = await browser.newPage({ viewport });
  await page.route("**/api/public/widgets/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) }),
  );
  await page.setContent(
    `<!doctype html><html><body>${mount ? '<div id="why-widget-tok"></div>' : ""}` +
      `<script data-token="tok" data-mount="#why-widget-tok" src="https://app.example/embed/widget.js"></script>` +
      `</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  // Inject the real embed with a base URL the script can resolve against.
  await page.evaluate((js) => {
    const s = document.querySelector("script[data-token]");
    Object.defineProperty(s, "src", { value: "https://app.example/embed/widget.js", writable: false });
    // eslint-disable-next-line no-eval
    (0, eval)(js);
  }, EMBED_JS);
  await page.waitForTimeout(400);
  try {
    await fn(page);
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch();

/* 1 — zero-review location shows an intentional empty state */
await render(browser, buildPayload({ reviews: [], videos: [], locationName: "Same Day Cabinets Orlando" }), async (page) => {
  const empty = await page.$(".why-widget-empty");
  check("zero-review location renders the empty state", Boolean(empty));
  const category = empty ? await empty.getAttribute("data-empty-category") : null;
  check("empty state carries the resolver's category", category === "no_content", `category=${category}`);
  const cards = await page.$$(".why-widget-card");
  check("no review cards are rendered", cards.length === 0, `${cards.length} cards`);
  const text = await page.textContent("body");
  check("no rating score is displayed", !/4\.8/.test(text), text.trim().slice(0, 60));
  check("no other location's business data leaks", !/NOVA|Acme/i.test(text));
  check("no Load more affordance on an empty wall", !(await page.$(".why-widget-button")));
});

/* 2 — content modes */
await render(browser, buildPayload({ widget: { contentType: "TEXT" } }), async (page) => {
  check("REVIEWS renders review cards only",
    (await page.$$(".why-widget-card")).length === 4 && (await page.$$(".why-video-card")).length === 0);
});

await render(browser, buildPayload({ widget: { contentType: "MIXED" } }), async (page) => {
  const videoCards = await page.$$(".why-video-card");
  const reviewCards = await page.$$(".why-widget-card");
  check("MIXED renders at least one video card", videoCards.length >= 1, `${videoCards.length} video(s)`);
  check("MIXED still renders review cards", reviewCards.length >= 1, `${reviewCards.length} review(s)`);
});

await render(browser, buildPayload({ widget: { contentType: "VIDEO" } }), async (page) => {
  check("VIDEOS renders video cards only",
    (await page.$$(".why-video-card")).length === 1 && (await page.$$(".why-widget-card")).length === 0);
});

/* 3 — card heights, with deliberately unequal review lengths */
// The wall is a 2-column layout over reviews of deliberately unequal length:
//   "equal"   → the two cards in each row match each other
//   "natural" → each card keeps its own content height
let equalHeights = [];
let naturalHeights = [];
const measure = (page) =>
  page.$$eval(".why-widget-card", (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
const rowPairs = (hs) => hs.reduce((acc, _, i) => (i % 2 === 0 ? [...acc, hs.slice(i, i + 2)] : acc), []);

await render(browser, buildPayload({ widget: { cardHeights: "equal", gridColumns: "2" } }), async (page) => {
  equalHeights = await measure(page);
  const display = await page.$eval(".why-widget-masonry", (e) => getComputedStyle(e).display);
  const cols = await page.$eval(".why-widget-masonry", (e) => getComputedStyle(e).gridTemplateColumns);
  check("equal uses a CSS grid", display === "grid", `display=${display}`);
  check("equal builds the configured column count", cols.split(" ").length === 2, `columns=${cols}`);
});

await render(browser, buildPayload({ widget: { cardHeights: "natural", gridColumns: "2" } }), async (page) => {
  naturalHeights = await measure(page);
  const display = await page.$eval(".why-widget-masonry", (e) => getComputedStyle(e).display);
  const colCount = await page.$eval(".why-widget-masonry", (e) => getComputedStyle(e).columnCount);
  check("natural uses CSS multi-column, not grid", display === "block", `display=${display}`);
  check("natural builds the configured column count", colCount === "2", `columnCount=${colCount}`);
});

const equalRows = rowPairs(equalHeights);
const naturalRows = rowPairs(naturalHeights);
check(
  "equal aligns card heights within each row",
  equalRows.every(([a, b]) => b === undefined || a === b),
  JSON.stringify(equalHeights),
);
check(
  "natural lets card heights follow their content",
  naturalRows.some(([a, b]) => b !== undefined && a !== b),
  JSON.stringify(naturalHeights),
);
check(
  "the two modes render visibly differently",
  JSON.stringify(equalHeights) !== JSON.stringify(naturalHeights),
  `equal=${JSON.stringify(equalHeights)} natural=${JSON.stringify(naturalHeights)}`,
);

/* 4 — pinning */
await render(browser, buildPayload({ widget: { pinnedReviewIds: "r4" } }), async (page) => {
  const first = await page.$eval(".why-widget-card", (e) => e.textContent);
  check("a pinned lower-ranked review leads the wall", /Robin/.test(first), first.trim().slice(0, 40));
  check("the pinned card is visually marked", Boolean(await page.$(".why-widget-card-pinned")));
  const markedCount = (await page.$$(".why-widget-card-pinned")).length;
  check("only the pinned card is marked", markedCount === 1, `${markedCount} marked`);
});
await render(browser, buildPayload({ widget: { pinnedReviewIds: "" } }), async (page) => {
  const first = await page.$eval(".why-widget-card", (e) => e.textContent);
  check("unpinning restores the deterministic order", /Dana/.test(first), first.trim().slice(0, 40));
  check("no pinned markers remain", (await page.$$(".why-widget-card-pinned")).length === 0);
});

/* 5 — source filters */
await render(browser, buildPayload({ widget: { enabledSources: "GOOGLE,YELP,INTERNAL" } }), async (page) => {
  const text = await page.textContent(".why-widget");
  check("turning Facebook off removes only its card", !/Ali/.test(text) && /Dana/.test(text) && /Robin/.test(text));
  check("remaining sources are untouched", (await page.$$(".why-widget-card")).length === 3);
});
await render(browser, buildPayload({ widget: { enabledSources: "INTERNAL" } }), async (page) => {
  const empty = await page.$(".why-widget-empty");
  check("a filter matching nothing shows the filtered empty state", Boolean(empty));
  const cat = empty ? await empty.getAttribute("data-empty-category") : null;
  check("filtered empty state is distinguishable from no-content", cat === "filtered_out", `category=${cat}`);
});

/* 6 — display toggles reach the embed */
await render(browser, buildPayload({ widget: { showWriteReview: false, showResponses: false } }), async (page) => {
  const text = await page.textContent(".why-widget");
  check("hidden write-review link is absent", !/Write a review/.test(text));
  check("owner responses are absent when the toggle is off", !/Thanks Ali/.test(text));
});
await render(browser, buildPayload({ widget: { showWriteReview: true, showResponses: true } }), async (page) => {
  const text = await page.textContent(".why-widget");
  check("visible write-review link is present", /Write a review/.test(text));
  check("owner responses render when the toggle is on", /Thanks Ali/.test(text));
});

/* 7 — Collect reviews global button, desktop vs mobile */
const collectPayload = buildPayload({
  widget: {
    widgetType: "COLLECTING", renderKind: "collecting",
    collectButtonPosition: "left", collectButtonTheme: "minimal",
    collectButtonColor: "#0e9488", collectMobileBehavior: "hidden",
  },
});
await render(browser, collectPayload, async (page) => {
  const btn = await page.$(".why-collect-btn");
  check("collect button renders on desktop", Boolean(btn));
  const cls = btn ? await btn.getAttribute("class") : "";
  check("left-tab position is applied", /why-collect-tab-l/.test(cls), cls);
  const bg = btn ? await btn.evaluate((e) => getComputedStyle(e).backgroundColor) : "";
  check("minimal style is transparent, not filled", bg === "rgba(0, 0, 0, 0)", bg);
  const border = btn ? await btn.evaluate((e) => getComputedStyle(e).borderColor) : "";
  check("custom colour drives the outline", border === "rgb(14, 148, 136)", border);
}, { mount: false });

await render(browser, collectPayload, async (page) => {
  check("hidden-mobile suppresses the button at a mobile viewport", !(await page.$(".why-collect-btn")));
}, { viewport: { width: 390, height: 844 }, mount: false });

await render(browser, buildPayload({
  widget: {
    widgetType: "COLLECTING", renderKind: "collecting",
    collectButtonPosition: "left", collectMobileBehavior: "pill",
  },
}), async (page) => {
  check("show-on-mobile renders the button at a mobile viewport", Boolean(await page.$(".why-collect-btn")));
}, { viewport: { width: 390, height: 844 }, mount: false });

/* 8 — resilience */
await render(browser, buildPayload({ widget: { pinnedReviewIds: "deleted-id,r4" } }), async (page) => {
  check("a deleted pinned review does not break the wall", (await page.$$(".why-widget-card")).length === 4);
  check("the surviving pin still leads", /Robin/.test(await page.$eval(".why-widget-card", (e) => e.textContent)));
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error("FAILED:\n" + failed.map((f) => `  - ${f.name} (${f.detail})`).join("\n"));
  process.exit(1);
}
