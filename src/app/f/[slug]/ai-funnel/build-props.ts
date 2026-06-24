import {
  resolveHighRating,
  destinationExternalUrl,
  destinationLabel,
  type HighRatingDestination,
} from "@/lib/review-routing";

// mirror of buildGoogleWriteReviewLink
function buildGoogleWriteReviewLink(googlePlaceId: string | null | undefined): string | null {
  const id = typeof googlePlaceId === "string" ? googlePlaceId.trim() : "";
  if (!id) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`;
}

const DEFAULT_STOOD_OUT = [
  "Great Website Design", "Highly Recommend", "Improved SEO & Rankings", "Real Results",
  "Professional Team", "Knowledgeable", "Went Above & Beyond", "Great Communication",
  "Friendly Staff", "Great Service", "Fair Pricing", "Easy Process", "Would Recommend",
];

const DEFAULT_SERVICES = [
  "Website Design", "Local SEO", "Google Ads", "Branding", "Social Media", "Content Marketing", "Full-service Retainer",
];

const DEFAULT_ISSUES = [
  "Long Wait Time", "Poor Communication", "Scheduling Issue", "Billing Concern",
  "Staff Interaction", "Service Quality", "Unexpected Cost", "Problem Not Resolved", "Other",
];

// ── Glyph/color map ───────────────────────────────────────────────────────────

const DESTINATION_GLYPH: Record<HighRatingDestination, string> = {
  GOOGLE: "G",
  FACEBOOK: "f",
  WEHEARYOU: "W",
  CUSTOM: "★",
};

const DESTINATION_COLOR: Record<HighRatingDestination, string> = {
  GOOGLE: "var(--src-google)",
  FACEBOOK: "var(--src-facebook)",
  WEHEARYOU: "var(--accent)",
  CUSTOM: "var(--src-trustpilot)",
};

// ── Exported interfaces ───────────────────────────────────────────────────────

export interface FunnelDestination {
  id: string;
  label: string;
  url: string | null;
  glyph: string;
  color: string;
  preferred: boolean;
  isInternal: boolean;
}

export interface AiFunnelProps {
  slug: string;
  locationId: string;
  embed: boolean;
  threshold: number;
  internalReviewBase: string;
  business: {
    name: string;
    location: string;
    logoUrl: string | null;
    initial: string;
    hue: number;
  };
  destinations: FunnelDestination[];
  stoodOut: string[];
  services: string[];
  issues: string[];
  ai: {
    reviewEnabled: boolean;
    allowNotes: boolean;
    allowTone: boolean;
    allowLength: boolean;
    allowRegenerate: boolean;
    includeService: boolean;
    clarifyEnabled: boolean;
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildAiFunnelProps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location: any /* LocationWithProfile */,
  opts: { slug: string; embed: boolean },
): AiFunnelProps {
  const profile = location.publicProfile;

  // Business
  const businessLocation = [location.city, location.state].filter(Boolean).join(", ");
  const initial = location.name ? location.name.charAt(0).toUpperCase() : "?";

  // Destinations
  const resolution = resolveHighRating(
    profile.highRatingMode,
    profile.highRatingDestinations,
    profile.highRatingPrimaryDestination,
  );

  const destList: HighRatingDestination[] =
    resolution.kind === "single" ? [resolution.destination] : resolution.destinations;

  const ctx = {
    googleReviewLink: location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId),
    facebookReviewUrl: profile.facebookReviewUrl,
    customReviewUrl: profile.customReviewUrl,
  };

  const destinations: FunnelDestination[] = destList.map((dest, index) => ({
    id: dest.toLowerCase(),
    label: destinationLabel(dest),
    url: destinationExternalUrl(dest, ctx),
    glyph: DESTINATION_GLYPH[dest],
    color: DESTINATION_COLOR[dest],
    preferred: index === 0,
    isInternal: dest === "WEHEARYOU",
  }));

  // stoodOut: start from custom chips or defaults, then prepend up to 4 reviewHighlights not already present
  const baseChips: string[] =
    profile.aiAssistantCustomChips.length > 0
      ? [...profile.aiAssistantCustomChips]
      : [...DEFAULT_STOOD_OUT];

  const highlights: string[] = Array.isArray(profile.reviewHighlights) ? profile.reviewHighlights : [];
  const toAdd = highlights.filter((h: string) => !baseChips.includes(h)).slice(0, 4);
  const stoodOut = [...toAdd, ...baseChips];

  // services
  const services: string[] =
    profile.services.length > 0 ? [...profile.services] : [...DEFAULT_SERVICES];

  // issues
  const issues: string[] = [...DEFAULT_ISSUES];

  // ai flags
  const reviewEnabled = !!(profile.aiAssistantEnabled && profile.aiAssistantAllowGeneration);

  return {
    slug: opts.slug,
    locationId: location.id,
    embed: opts.embed,
    threshold: profile.negativeFilterThreshold,
    internalReviewBase: `/f/${opts.slug}`,
    business: {
      name: location.name,
      location: businessLocation,
      logoUrl: profile.logoUrl ?? null,
      initial,
      hue: 187,
    },
    destinations,
    stoodOut,
    services,
    issues,
    ai: {
      reviewEnabled,
      allowNotes: !!profile.aiAssistantAllowNotes,
      allowTone: !!profile.aiAssistantAllowTone,
      allowLength: !!profile.aiAssistantAllowLength,
      allowRegenerate: !!profile.aiAssistantAllowRegenerate,
      includeService: !!profile.aiAssistantIncludeService,
      clarifyEnabled: true,
    },
  };
}
