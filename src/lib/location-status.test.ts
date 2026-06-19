import assert from "node:assert/strict";
import test from "node:test";
import { deriveLocationStatus, isMiniSiteProfileComplete } from "./location-status.ts";

test("Active when published with a connected source", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: true, miniSitePublishedAt: new Date(), hasConnectedSource: true, profileComplete: true }),
    "Active",
  );
});

test("Needs setup when no connected source", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: false, profileComplete: true }),
    "Needs setup",
  );
});

test("Needs setup when profile incomplete and unpublished", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: true, profileComplete: false }),
    "Needs setup",
  );
});

test("Draft when set up but never published", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: true, profileComplete: true }),
    "Draft",
  );
});

test("Paused when previously published but now unpublished", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: new Date(), hasConnectedSource: true, profileComplete: true }),
    "Paused",
  );
});

test("isMiniSiteProfileComplete requires phone and website", () => {
  assert.equal(isMiniSiteProfileComplete({ phone: "555", websiteUrl: "https://x.com" }), true);
  assert.equal(isMiniSiteProfileComplete({ phone: null, websiteUrl: "https://x.com" }), false);
  assert.equal(isMiniSiteProfileComplete({ phone: "555", websiteUrl: null }), false);
});
