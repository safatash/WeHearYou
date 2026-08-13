import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildGbpPostComposerPath,
  canAccessGbpPostLocation,
} from "./gbp-post-navigation";

test("dashboard compose path opens the canonical drawer route", () => {
  assert.equal(buildGbpPostComposerPath(), "/gbp/post/new");
});

test("empty location scopes fail closed", () => {
  assert.equal(canAccessGbpPostLocation([], "location-a"), false);
  assert.equal(canAccessGbpPostLocation(["location-a"], ""), false);
  assert.equal(canAccessGbpPostLocation(["location-a"], "location-a"), true);
  assert.equal(canAccessGbpPostLocation(["location-a"], "location-b"), false);
});

test("dashboard uses the canonical drawer route and legacy new-post URLs redirect into it", () => {
  const dashboard = readFileSync(new URL("../app/gbp/page.tsx", import.meta.url), "utf8");
  const canonicalRoute = readFileSync(new URL("../app/gbp/post/new/page.tsx", import.meta.url), "utf8");
  const legacyRoute = readFileSync(new URL("../app/gbp/posts/new/page.tsx", import.meta.url), "utf8");
  const postsView = readFileSync(new URL("../components/gbp/gbp-posts-view.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /href=\{buildGbpPostComposerPath\(\)\}/);
  assert.match(canonicalRoute, /<GbpPostsScreen openComposerFromRoute \/>/);
  assert.match(legacyRoute, /redirect\(GBP_NEW_POST_PATH\)/);
  assert.match(postsView, /router\.push\(GBP_NEW_POST_PATH\)/);
  assert.match(postsView, /router\.replace\(GBP_POSTS_PATH\)/);
  assert.ok(!/window\.history\.replaceState/.test(postsView));
});

test("the shared posts surface and mutations keep empty scopes restricted rather than treating them as unrestricted", () => {
  const postsScreen = readFileSync(new URL("../components/gbp/gbp-posts-screen.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/gbp/posts/actions.ts", import.meta.url), "utf8");

  assert.match(postsScreen, /id: \{ in: locationIds \}/);
  assert.ok(!/locationIds\.length > 0 \? \{ locationId: \{ in: locationIds \} \} : \{\}/.test(postsScreen));
  assert.match(actions, /canAccessGbpPostLocation\(locationIds, locationId\)/);
  assert.equal((actions.match(/locationId: \{ in: locationIds \}/g) ?? []).length, 3);
});
