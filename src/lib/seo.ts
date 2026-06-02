import type { Metadata } from "next";

// ─── Local types (framework-independent, no Prisma imports) ───────────────────

type SeoReview = {
  source: string;
  status: string;
  isTestimonial: boolean;
  isWidgetVisible: boolean;
  reviewerName: string;
  body: string | null;
  rating: number;
};

type SeoPublicProfile = {
  schemaEnabled: boolean;
  heroImageUrl: string | null;
  logoUrl: string | null;
  googleMapsUrl: string | null;
  businessType: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  showAiReviewSummary: boolean;
  aiReviewSummary: string | null;
  showReviews: boolean;
  showTestimonials: boolean;
};

export type SeoLocation = {
  name: string;
  slug: string;
  city: string;
  state: string;
  avgRating: number | null;
  publicProfile: SeoPublicProfile | null;
  reviews: SeoReview[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const VALID_SCHEMA_TYPES = new Set([
  "LocalBusiness",
  "Restaurant",
  "MedicalBusiness",
  "Dentist",
  "Physician",
  "LegalService",
  "FinancialService",
  "AutoRepair",
  "HairSalon",
  "BeautySalon",
  "HealthClub",
  "Hotel",
  "RealEstateAgent",
  "Store",
  "FoodEstablishment",
  "ProfessionalService",
  "HomeAndConstructionBusiness",
  "SportsActivityLocation",
]) as ReadonlySet<string>;

// ─── Pure helper functions ────────────────────────────────────────────────────

export function isPublicProfileIndexable(
  location: Pick<SeoLocation, "name" | "slug" | "publicProfile">,
): boolean {
  if (!location.publicProfile) return false;
  if (!location.publicProfile.schemaEnabled) return false;
  if (!location.slug.trim()) return false;
  if (!location.name.trim()) return false;
  return true;
}

export function buildPageTitle(
  name: string,
  city: string | null,
  state: string | null,
): string {
  if (city && state) return `${name} Reviews | ${city}, ${state}`;
  if (city) return `${name} Reviews | ${city}`;
  if (state) return `${name} Reviews | ${state}`;
  return `${name} — Customer Reviews`;
}

export function buildPageDescription(
  name: string,
  city: string | null,
  state: string | null,
  reviewCount: number,
  avgRating: number | string,
  aiSummary: string | null,
): string {
  if (aiSummary !== null && aiSummary !== "") {
    return aiSummary;
  }

  const locationSuffix =
    city && state
      ? ` in ${city}, ${state}`
      : city
        ? ` in ${city}`
        : state
          ? ` in ${state}`
          : "";

  if (reviewCount > 0) {
    const avg =
      typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating;
    return `Read ${reviewCount} customer reviews for ${name}${locationSuffix}. Rated ${avg} stars.`;
  }

  return `Discover ${name}${locationSuffix} on WeHearYou.`;
}

export function buildCanonicalUrl(baseUrl: string, slug: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/b/${slug}`;
}

export function pickOgImage(
  heroImageUrl: string | null | undefined,
  logoUrl: string | null | undefined,
  defaultImageUrl: string | null | undefined,
): string | null {
  if (heroImageUrl) return heroImageUrl;
  if (logoUrl) return logoUrl;
  if (defaultImageUrl) return defaultImageUrl;
  return null;
}

export function sanitizeReviewText(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  const stripped = text.replace(/<[^>]*>/g, "").trim();
  return stripped.slice(0, 500);
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function computeSeoStats(location: SeoLocation): {
  ratingCount: number;
  averageRating: string;
} {
  const showReviews = location.publicProfile?.showReviews ?? true;
  const showTestimonials = location.publicProfile?.showTestimonials ?? true;

  const visibleReviews = location.reviews.filter((review) => {
    if (review.isTestimonial) {
      return showTestimonials && review.isWidgetVisible && review.status === "PUBLISHED";
    }
    return (
      showReviews &&
      (review.source === "GOOGLE" || review.source === "FACEBOOK") &&
      review.status === "PUBLISHED"
    );
  });

  const ratingCount = visibleReviews.length;
  const averageRating =
    ratingCount > 0
      ? (
          visibleReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
        ).toFixed(1)
      : (location.avgRating?.toFixed(1) ?? "0.0");

  return { ratingCount, averageRating };
}

// ─── Metadata builder ─────────────────────────────────────────────────────────

export function buildLocationMetadata(
  location: SeoLocation,
  baseUrl: string,
  defaultOgImage?: string | null,
): Metadata {
  const indexable = isPublicProfileIndexable(location);
  const stats = computeSeoStats(location);
  const title = buildPageTitle(location.name, location.city, location.state);
  const description = buildPageDescription(
    location.name,
    location.city,
    location.state,
    stats.ratingCount,
    stats.averageRating,
    location.publicProfile?.showAiReviewSummary
      ? (location.publicProfile.aiReviewSummary ?? null)
      : null,
  );
  const canonical = buildCanonicalUrl(baseUrl, location.slug);
  const ogImage = pickOgImage(
    location.publicProfile?.heroImageUrl,
    location.publicProfile?.logoUrl,
    defaultOgImage ?? null,
  );

  return {
    title,
    description,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

// ─── JSON-LD schema builder ───────────────────────────────────────────────────

export function buildLocalBusinessSchema(
  location: SeoLocation,
  baseUrl: string,
): Record<string, unknown> {
  const profile = location.publicProfile;
  const stats = computeSeoStats(location);
  const canonical = buildCanonicalUrl(baseUrl, location.slug);

  const schemaType =
    profile?.businessType && VALID_SCHEMA_TYPES.has(profile.businessType)
      ? profile.businessType
      : "LocalBusiness";

  const image = pickOgImage(
    profile?.heroImageUrl,
    profile?.logoUrl,
    null,
  );

  const address = profile?.addressLine1
    ? {
        "@type": "PostalAddress",
        streetAddress: [profile.addressLine1, profile.addressLine2]
          .filter(Boolean)
          .join(", "),
        addressLocality: location.city,
        addressRegion: location.state,
        postalCode: profile.postalCode || undefined,
      }
    : undefined;

  const aggregateRating =
    stats.ratingCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: parseFloat(stats.averageRating),
          reviewCount: stats.ratingCount,
        }
      : undefined;

  const jsonLdReviews = location.reviews
    .filter((review) => {
      const isPublicSource =
        (review.source === "GOOGLE" || review.source === "FACEBOOK") &&
        review.status === "PUBLISHED" &&
        !review.isTestimonial;
      const isVisibleTestimonial =
        review.isTestimonial && review.isWidgetVisible && review.status === "PUBLISHED";
      if (!isPublicSource && !isVisibleTestimonial) return false;
      if (!review.reviewerName) return false;
      const sanitized = sanitizeReviewText(review.body);
      if (!sanitized) return false;
      return true;
    })
    .slice(0, 5)
    .map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: sanitizeReviewText(review.reviewerName),
      },
      reviewBody: sanitizeReviewText(review.body),
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${canonical}#localbusiness`,
    url: canonical,
    name: location.name,
    telephone: profile?.phone || undefined,
    email: profile?.email || undefined,
    address,
    image: image ?? undefined,
    sameAs: profile?.googleMapsUrl ? [profile.googleMapsUrl] : undefined,
    aggregateRating,
    ...(jsonLdReviews.length > 0 ? { review: jsonLdReviews } : {}),
  };
}
