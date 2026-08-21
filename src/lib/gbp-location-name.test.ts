import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { qualifyGbpLocationName } from "./gbp-location-name";

const LOCATIONS = [
  { name: "locations/456", accountResourceName: "accounts/123" },
  { name: "locations/789", accountResourceName: "accounts/999" },
];

test("a stored location name is qualified with its owning account", () => {
  assert.equal(qualifyGbpLocationName("locations/456", LOCATIONS), "accounts/123/locations/456");
  assert.equal(qualifyGbpLocationName("locations/789", LOCATIONS), "accounts/999/locations/789");
});

test("an already-qualified name is left alone, so qualifying twice is safe", () => {
  assert.equal(
    qualifyGbpLocationName("accounts/123/locations/456", LOCATIONS),
    "accounts/123/locations/456",
  );
});

test("an unmatched location is returned unchanged rather than guessed at", () => {
  // Failing loudly against Google beats addressing another account's location.
  assert.equal(qualifyGbpLocationName("locations/000", LOCATIONS), "locations/000");
  assert.equal(qualifyGbpLocationName("locations/456", []), "locations/456");
});

test("a location Google returns without an account prefix is returned unchanged", () => {
  assert.equal(qualifyGbpLocationName("locations/456", [{ name: "locations/456" }]), "locations/456");
});

test("empty input is passed through", () => {
  assert.equal(qualifyGbpLocationName("", LOCATIONS), "");
});

// The regression guard. v4 addresses a location as
// "accounts/{accountId}/locations/{locationId}"; passing the bare stored name
// returns a 404 from Google. Four call sites drifted from that contract at once
// because nothing asserted it — this is what notices next time.
test("every v4 caller passes a qualified location name, never the stored one", () => {
  const sources = {
    "app/gbp/actions.ts": readFileSync(new URL("../app/gbp/actions.ts", import.meta.url), "utf8"),
    "lib/gbp-scheduler.ts": readFileSync(new URL("./gbp-scheduler.ts", import.meta.url), "utf8"),
    "lib/gbp-sync.ts": readFileSync(new URL("./gbp-sync.ts", import.meta.url), "utf8"),
    "lib/google-reply.ts": readFileSync(new URL("./google-reply.ts", import.meta.url), "utf8"),
  };

  for (const [label, source] of Object.entries(sources)) {
    assert.match(
      source,
      /qualifyGbpLocationName|resolveGbpLocationName/,
      `${label} must resolve the account prefix before calling a v4 endpoint`,
    );
  }

  // The specific shape of the original bug: a v4 helper handed `…googleLocationName` directly.
  const v4Helpers = /(?:createGbpPost|uploadGbpPhoto|listGbpQuestions)\(\s*accessToken,\s*([A-Za-z0-9_.]+)/g;
  for (const [label, source] of Object.entries(sources)) {
    for (const match of source.matchAll(v4Helpers)) {
      assert.doesNotMatch(
        match[1],
        /googleLocationName$/,
        `${label} passes the unqualified ${match[1]} to a v4 endpoint`,
      );
    }
  }
});
