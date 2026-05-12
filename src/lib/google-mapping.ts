export function isMalformedGoogleLocationName(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return false;
  }

  return !normalized.includes("/locations/");
}

export function buildGoogleMappingHealth({
  googleLocationName,
  googlePlaceId,
}: {
  googleLocationName: string | null | undefined;
  googlePlaceId: string | null | undefined;
}) {
  const malformed = isMalformedGoogleLocationName(googleLocationName);

  if (malformed) {
    return {
      status: "malformed" as const,
      message: "This location has a Place ID but not a valid Google Business Profile resource mapping. Remap it from the Google Mapping section.",
    };
  }

  if (googleLocationName) {
    return {
      status: "mapped" as const,
      message: "Google Business Profile mapping looks valid.",
    };
  }

  if (googlePlaceId) {
    return {
      status: "place_only" as const,
      message: "Place ID saved, but no connected Google Business Profile mapping yet.",
    };
  }

  return {
    status: "unmapped" as const,
    message: "No Google mapping saved yet.",
  };
}
