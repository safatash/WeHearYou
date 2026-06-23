export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicLocationBySlug, getPublicProfileStats, getVisiblePublicReviews, getVisibleTestimonials } from "@/lib/public-profile";
import { buildLocalBusinessSchema, buildLocationMetadata } from "@/lib/seo";
import { formatReviewDate, formatReviewSource, truncateReviewBody } from "@/lib/reviews";
import { resolveCta } from "@/lib/minisite-cta";
import type { CtaType } from "@/lib/minisite-cta";
import { MiniSiteTracker } from "@/components/minisite-tracker";
import { MiniSiteHero } from "./_components/minisite-hero";
import { TrustSummary } from "./_components/trust-summary";
import { FeaturedReviews } from "./_components/featured-reviews";
import { LeaveAReview } from "./_components/leave-a-review";
import { LocationInfo } from "./_components/location-info";
import { MiniSiteFooter } from "./_components/minisite-footer";
import { MiniSiteUnavailable } from "./_components/minisite-unavailable";
import type { ReviewSource } from "./_components/source-badge";
import type { ReviewSourceLink } from "./_components/leave-a-review";
import type { HoursRow } from "./_components/location-info";

function parseHoursLines(googleHours: string | null | undefined): HoursRow[] {
  if (!googleHours) return [];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const short = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return googleHours.split("\n").filter(Boolean).map((line) => {
    const colonIdx = line.indexOf(":");
    const day = colonIdx > 0 ? line.slice(0, colonIdx).trim() : line;
    const hrs = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : "";
    const dayIndex = days.findIndex((d) => day.toLowerCase().startsWith(d.toLowerCase()));
    const todayIndex = (new Date().getDay() + 6) % 7;
    return { day: dayIndex >= 0 ? short[dayIndex] : day, hours: hrs, isToday: dayIndex === todayIndex };
  });
}

// Map a DB review source (uppercase) to the lowercase ReviewSource used by components
function toReviewSource(source: string): ReviewSource | null {
  switch (source.toLowerCase()) {
    case "google": return "google";
    case "facebook": return "facebook";
    case "yelp": return "yelp";
    case "trustpilot": return "trustpilot";
    default: return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const location = await getPublicLocationBySlug(slug);
  if (!location) return { robots: { index: false, follow: false } };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app";
  const defaultOgImage = process.env.NEXT_PUBLIC_OG_IMAGE ?? null;
  return buildLocationMetadata(location, baseUrl, defaultOgImage);
}

export default async function BusinessMiniSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const location = await getPublicLocationBySlug(slug);
  if (!location) notFound();

  const isPreview = typeof query.preview === "string" && query.preview === "1";
  if (!location.miniSitePublished && !isPreview) {
    return <MiniSiteUnavailable name={location.name} />;
  }

  const profile = location.publicProfile;
  const stats = getPublicProfileStats(location);
  const publicReviews = getVisiblePublicReviews(location);
  const testimonials = getVisibleTestimonials(location);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app";
  const schema = buildLocalBusinessSchema(location, baseUrl);

  // Derived data (mirrors the old page)
  const reviewDestination = location.reviewLink || profile?.ctaUrl || null;
  const fullAddress = [profile?.addressLine1, location.city, location.state, profile?.postalCode].filter(Boolean).join(", ");
  const mapUrl = profile?.googleMapsUrl ?? null;
  const phone = profile?.phone || null;
  const email = profile?.email || null;
  const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "";
  const mapEmbedUrl =
    mapsEmbedKey && location.googlePlaceId
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsEmbedKey}&q=place_id:${location.googlePlaceId}`
      : null;

  // CTAs
  const ctaOpts = {
    phone,
    websiteUrl: profile?.websiteUrl ?? null,
    bookingUrl: profile?.bookingUrl ?? null,
    mapsUrl: mapUrl,
    reviewUrl: reviewDestination,
  };
  const primaryCta = resolveCta(profile?.ctaType as CtaType | null | undefined, {
    ...ctaOpts,
    label: profile?.ctaLabel,
  });
  const secondaryCta = resolveCta(profile?.secondaryCtaType as CtaType | null | undefined, {
    ...ctaOpts,
    label: profile?.secondaryCtaLabel,
  });

  // Review sources for LeaveAReview section
  // Prefer profile.enabledReviewSources if non-empty; else fall back to connected sources from reviews
  const enabledSources: ReviewSourceLink[] = (() => {
    const configured = (profile?.enabledReviewSources ?? []) as string[];
    if (configured.length > 0) {
      return configured.flatMap((src): ReviewSourceLink[] => {
        const reviewSource = toReviewSource(src);
        if (!reviewSource) return [];
        const href =
          reviewSource === "google"
            ? (reviewDestination ?? null)
            : reviewSource === "facebook"
            ? (profile?.facebookReviewUrl ?? null)
            : null;
        if (!href) return [];
        return [{ source: reviewSource, href }];
      });
    }
    // Fall back: detect sources from visible reviews
    const seenSources = new Set<ReviewSource>();
    const result: ReviewSourceLink[] = [];
    for (const r of [...publicReviews, ...testimonials]) {
      const src = toReviewSource(r.source ?? "");
      if (src && !seenSources.has(src)) {
        const href =
          src === "google"
            ? reviewDestination
            : src === "facebook"
            ? (profile?.facebookReviewUrl ?? null)
            : null;
        if (href) {
          seenSources.add(src);
          result.push({ source: src, href });
        }
      }
    }
    return result;
  })();

  // Map DB reviews to ReviewCardProps for FeaturedReviews
  const allReviews = [...publicReviews, ...testimonials];
  const reviewCards = allReviews.map((r) => ({
    id: r.id,
    reviewerName: r.reviewerName,
    reviewerPhotoUrl: r.reviewerPhotoUrl,
    rating: r.rating ?? 0,
    source: formatReviewSource(r.source as Parameters<typeof formatReviewSource>[0], r.isTestimonial) as string,
    dateLabel: formatReviewDate(r.reviewedAt),
    body: r.body ? truncateReviewBody(r.body, 320) : null,
    featured: r.isFeatured ?? false,
    ownerReply: (r.replyPublishedAt || r.replySentAt) && r.replyDraft ? r.replyDraft : null,
    sourceReviewUrl: r.sourceReviewUrl ?? null,
  }));

  // Hours
  const hours = parseHoursLines(profile?.googleHours);

  // Sources for hero badges (connected sources from reviews, lowercase)
  const heroSources = Array.from(
    new Set(
      allReviews.map((r) => toReviewSource(r.source ?? "")).filter((s): s is ReviewSource => s !== null),
    ),
  );

  return (
    <main
      className="min-h-screen bg-[var(--page,#f8fafc)] text-[var(--ink-900,#0f172a)]"
      style={{ ["--accent" as string]: profile?.accentColor || "#37AEB7" } as React.CSSProperties}
    >
      {profile?.schemaEnabled ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ) : null}

      <MiniSiteTracker slug={location.slug} enabled={!isPreview} />

      <MiniSiteHero
        name={profile?.headline || location.name}
        description={profile?.subheadline ?? null}
        logoUrl={profile?.logoUrl ?? null}
        heroImageUrl={profile?.heroImageUrl ?? null}
        avgRating={stats.averageRating !== "0.0" ? parseFloat(stats.averageRating) : (location.avgRating ?? null)}
        reviewCount={stats.ratingCount > 0 ? stats.ratingCount : null}
        city={location.city ?? null}
        state={location.state ?? null}
        address={fullAddress || null}
        phone={phone}
        sources={heroSources}
        showVerified={profile?.showVerifiedBadge !== false}
        showSourceBadges={profile?.showSourceBadges !== false}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-5">
            {profile?.showReviewSummary !== false && (
              <TrustSummary
                avgRating={stats.averageRating !== "0.0" ? parseFloat(stats.averageRating) : (location.avgRating ?? 0)}
                reviewCount={stats.ratingCount}
                highlights={profile?.reviewHighlights ?? []}
                aiSummary={profile?.showAiReviewSummary && profile?.aiReviewSummary ? profile.aiReviewSummary : null}
                aiSummaryReviewCount={profile?.showAiReviewSummary ? (profile?.aiReviewSummaryReviewCount ?? null) : null}
              />
            )}

            <LocationInfo
              address={fullAddress || null}
              mapUrl={mapUrl}
              mapEmbedUrl={mapEmbedUrl}
              phone={phone}
              websiteUrl={profile?.websiteUrl ?? null}
              email={email}
              hours={hours}
              services={profile?.services ?? []}
              showServices={profile?.showServices !== false}
              showMap={profile?.showMap !== false}
              showHours={profile?.showHours !== false}
            />
          </aside>

          {/* Main content */}
          <div className="space-y-8">
            {profile?.showFeaturedReviews !== false && (
              <FeaturedReviews
                reviews={reviewCards}
                showSourceFilter={false}
                perPage={profile?.miniSiteReviewsPerPage ?? 12}
              />
            )}

            <LeaveAReview sources={enabledSources} />
          </div>
        </div>
      </div>

      <MiniSiteFooter
        businessName={location.name}
        showVerified={profile?.showVerifiedBadge !== false}
        showPoweredBy={profile?.showPoweredBy !== false}
      />
    </main>
  );
}
