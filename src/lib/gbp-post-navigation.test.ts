import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildGbpPostComposerPath,
  canAccessGbpPostLocation,
  isGbpPostComposerRequested,
} from "./gbp-post-navigation";

test("dashboard compose path opens the canonical posts composer", () => {
  assert.equal(buildGbpPostComposerPath(), "/gbp/posts?compose=new");
});

test("only the explicit compose=new query activates the composer", () => {
  assert.equal(isGbpPostComposerRequested("new"), true);
  assert.equal(isGbpPostComposerRequested(undefined), false);
  assert.equal(isGbpPostComposerRequested("edit"), false);
  assert.equal(isGbpPostComposerRequested(["new"]), false);
});

test("empty location scopes fail closed", () => {
  assert.equal(canAccessGbpPostLocation([], "location-a"), false);
  assert.equal(canAccessGbpPostLocation(["location-a"], ""), false);
  assert.equal(canAccessGbpPostLocation(["location-a"], "location-a"), true);
  assert.equal(canAccessGbpPostLocation(["location-a"], "location-b"), false);
});

test("dashboard entry opens the canonical composer and its route is cleared on dismissal", () => {
  const dashboard = readFileSync(new URL("../app/gbp/page.tsx", import.meta.url), "utf8");
  const postsPage = readFileSync(new URL("../app/gbp/posts/page.tsx", import.meta.url), "utf8");
  const postsView = readFileSync(new URL("../components/gbp/gbp-posts-view.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /href=\{buildGbpPostComposerPath\(\)\}/);
  assert.match(postsPage, /openComposerFromRoute=\{openComposerFromRoute\}/);
  assert.match(postsView, /router\.replace\("\/gbp\/posts"\)/);
});

test("posts data and mutations keep empty scopes restricted rather than treating them as unrestricted", () => {
  const postsPage = readFileSync(new URL("../app/gbp/posts/page.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../app/gbp/posts/actions.ts", import.meta.url), "utf8");

  assert.match(postsPage, /id: \{ in: locationIds \}/);
  assert.ok(!/locationIds\.length > 0 \? \{ locationId: \{ in: locationIds \} \} : \{\}/.test(postsPage));
  assert.match(actions, /canAccessGbpPostLocation\(locationIds, locationId\)/);
  assert.equal((actions.match(/locationId: \{ in: locationIds \}/g) ?? []).length, 3);
});
