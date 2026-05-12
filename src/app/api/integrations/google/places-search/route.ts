import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-oauth";
import { getCurrentMembership } from "@/lib/authz";

function extractAddressComponent(
  components: Array<{ longText?: string; shortText?: string; types?: string[] }> | undefined,
  type: string,
  fallback: "long" | "short" = "long",
) {
  const match = components?.find((component) => component.types?.includes(type));
  return fallback === "short" ? match?.shortText ?? "" : match?.longText ?? "";
}

export async function GET(request: NextRequest) {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const places = await searchGooglePlaces(query);
    const results = places.map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? place.formattedAddress ?? "Unknown place",
      formattedAddress: place.formattedAddress ?? place.shortFormattedAddress ?? "",
      addressLine1: [
        extractAddressComponent(place.addressComponents, "street_number"),
        extractAddressComponent(place.addressComponents, "route"),
      ]
        .filter(Boolean)
        .join(" "),
      city: extractAddressComponent(place.addressComponents, "locality") || extractAddressComponent(place.addressComponents, "postal_town"),
      state: extractAddressComponent(place.addressComponents, "administrative_area_level_1", "short"),
      postalCode: extractAddressComponent(place.addressComponents, "postal_code"),
      googlePlaceId: place.id,
      googleMapsUri: place.googleMapsUri ?? "",
      phone: place.nationalPhoneNumber ?? "",
      websiteUri: place.websiteUri ?? "",
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Places search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
