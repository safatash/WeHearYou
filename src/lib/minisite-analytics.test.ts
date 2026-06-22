import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMiniSiteEvents, isMiniSiteEventType } from "./review-link-analytics";

test("summarizes counts by event type", () => {
  const result = summarizeMiniSiteEvents([
    { eventType: "MINISITE_VIEWED", count: 10 },
    { eventType: "MINISITE_CLICK_CALL", count: 3 },
    { eventType: "MINISITE_CLICK_WEBSITE", count: 2 },
    { eventType: "MINISITE_CLICK_DIRECTIONS", count: 1 },
    { eventType: "MINISITE_CLICK_REVIEW", count: 4 },
    { eventType: "MINISITE_CLICK_CTA", count: 5 },
  ]);
  assert.equal(result.pageViews, 10);
  assert.equal(result.callClicks, 3);
  assert.equal(result.websiteClicks, 2);
  assert.equal(result.directionsClicks, 1);
  assert.equal(result.reviewClicks, 4);
  assert.equal(result.ctaClicks, 5);
  assert.equal(result.hasData, true);
});

test("hasData is false when there are no events", () => {
  const result = summarizeMiniSiteEvents([]);
  assert.equal(result.pageViews, 0);
  assert.equal(result.hasData, false);
});

test("ignores unrelated event types", () => {
  const result = summarizeMiniSiteEvents([{ eventType: "LINK_VIEWED", count: 99 }]);
  assert.equal(result.pageViews, 0);
  assert.equal(result.hasData, false);
});

test("isMiniSiteEventType guards the MINISITE_* set", () => {
  assert.equal(isMiniSiteEventType("MINISITE_VIEWED"), true);
  assert.equal(isMiniSiteEventType("LINK_VIEWED"), false);
  assert.equal(isMiniSiteEventType("garbage"), false);
});
