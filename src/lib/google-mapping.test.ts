import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleMappingHealth, isMalformedGoogleLocationName, isValidGoogleLocationName } from "./google-mapping";

test("accepts short Google Business Profile resource names", () => {
  assert.equal(isValidGoogleLocationName("locations/123456789"), true);
  assert.equal(isMalformedGoogleLocationName("locations/123456789"), false);
  assert.deepEqual(
    buildGoogleMappingHealth({
      googleLocationName: "locations/123456789",
      googlePlaceId: "ChIJtest",
    }),
    {
      status: "mapped",
      message: "Google Business Profile mapping looks valid.",
    },
  );
});

test("accepts fully qualified Google Business Profile resource names", () => {
  assert.equal(isValidGoogleLocationName("accounts/987654321/locations/123456789"), true);
  assert.equal(isMalformedGoogleLocationName("accounts/987654321/locations/123456789"), false);
});

test("still treats plain place ids as place-only mappings", () => {
  assert.deepEqual(
    buildGoogleMappingHealth({
      googleLocationName: null,
      googlePlaceId: "ChIJtest",
    }),
    {
      status: "place_only",
      message: "Place ID saved, but no connected Google Business Profile mapping yet.",
    },
  );
});
