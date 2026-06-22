import assert from "node:assert/strict";
import test from "node:test";
import { computeMiniSiteSetupChecklist } from "./minisite-setup.ts";

const full = { phone: "555", websiteUrl: "https://x.com", hasConnectedSource: true, hasFeaturedReview: true, miniSitePublished: true };

test("all items done when fully set up and published", () => {
  const items = computeMiniSiteSetupChecklist(full);
  assert.equal(items.length, 5);
  assert.ok(items.every((i) => i.done));
});

test("flags each missing item", () => {
  const items = computeMiniSiteSetupChecklist({ ...full, phone: null, hasConnectedSource: false, miniSitePublished: false });
  const byKey = Object.fromEntries(items.map((i) => [i.key, i.done]));
  assert.equal(byKey.phone, false);
  assert.equal(byKey.website, true);
  assert.equal(byKey.source, false);
  assert.equal(byKey.featured, true);
  assert.equal(byKey.publish, false);
});

test("items are in setup order", () => {
  const keys = computeMiniSiteSetupChecklist(full).map((i) => i.key);
  assert.deepEqual(keys, ["phone", "website", "source", "featured", "publish"]);
});
