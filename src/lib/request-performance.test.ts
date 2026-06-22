import assert from "node:assert/strict";
import test from "node:test";
import { computeRequestPerformance, getLocationRequestPerformance } from "./request-performance.ts";

const d = (s: string) => new Date(s);

test("computes rates over sent recipients", () => {
  const r = computeRequestPerformance({
    recipients: [
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02"), channel: "SMS" },
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: null, channel: "EMAIL" },
      { sentAt: d("2026-06-01"), openedAt: null, completedAt: null, channel: "SMS" },
      { sentAt: null, openedAt: null, completedAt: null, channel: "SMS" },
    ],
    campaigns: [{ name: "June push", createdAt: d("2026-06-01") }],
  });
  assert.equal(r.requestsSent, 3);
  assert.equal(r.openRate, 2 / 3);
  assert.equal(r.conversionRate, 1 / 3);
  assert.equal(r.clickRate, 1 / 3);
  assert.equal(r.bestChannel, "SMS");
  assert.equal(r.latestCampaignName, "June push");
  assert.equal(r.hasData, true);
});

test("hasData false and null rates when nothing sent", () => {
  const r = computeRequestPerformance({ recipients: [], campaigns: [] });
  assert.equal(r.requestsSent, 0);
  assert.equal(r.openRate, null);
  assert.equal(r.bestChannel, null);
  assert.equal(r.hasData, false);
});

test("bestChannel picks highest conversion", () => {
  const r = computeRequestPerformance({
    recipients: [
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02"), channel: "EMAIL" },
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: null, channel: "SMS" },
    ],
    campaigns: [],
  });
  assert.equal(r.bestChannel, "EMAIL");
});

test("getLocationRequestPerformance flattens campaign recipients", () => {
  const r = getLocationRequestPerformance({
    campaigns: [
      { name: "C1", channel: "SMS", createdAt: d("2026-06-01"), recipients: [
        { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02") },
      ] },
    ],
  });
  assert.equal(r.requestsSent, 1);
  assert.equal(r.bestChannel, "SMS");
  assert.equal(r.lastRequestSentAt?.toISOString(), d("2026-06-01").toISOString());
});
