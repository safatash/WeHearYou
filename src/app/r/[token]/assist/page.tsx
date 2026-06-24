export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { prisma } from "@/lib/prisma";
import { buildSuggestedChips, extractReviewThemes } from "@/lib/review-assistant-chips";
import type { AiFunnelProps, FunnelDestination } from "@/app/f/[slug]/ai-funnel/build-props";
import { CampaignAiFunnel } from "./campaign-ai-funnel";

export type AssistDestination = { key: string; label: string; url: string };

export default async function ReviewAssistPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const recipient = await getRecipientByToken(token);
  if (!recipient) notFound();

  const location = recipient.campaign.location;
  const profile = location.publicProfile;

  // If the assistant isn't enabled, fall back to the standard thank-you path.
  if (!profile?.aiAssistantEnabled) {
    redirect(`/r/${token}/thanks`);
  }

  const rating = Number(query.rating) || 5;

  // Derive themes directly from this location's real positive reviews.
  const recentReviews = profile.aiAssistantUseReviewThemes
    ? await prisma.review.findMany({
        where: { locationId: location.id, status: "PUBLISHED", body: { not: "" } },
        select: { body: true, rating: true },
        orderBy: { reviewedAt: "desc" },
        take: 50,
      })
    : [];
  const reviewThemes = extractReviewThemes(recentReviews);

  const chips = buildSuggestedChips({
    businessType: profile.businessType,
    services: profile.services,
    reviewThemes,
    reviewHighlights: profile.reviewHighlights,
    customChips: profile.aiAssistantCustomChips,
    useReviewThemes: profile.aiAssistantUseReviewThemes,
  });

  const DEST_GLYPH: Record<string, string> = {
    GOOGLE: "G",
    YELP: "Y",
    FACEBOOK: "f",
    TRUSTPILOT: "★",
  };
  const DEST_COLOR: Record<string, string> = {
    GOOGLE: "var(--src-google)",
    YELP: "var(--src-yelp)",
    FACEBOOK: "var(--src-facebook)",
    TRUSTPILOT: "var(--src-trustpilot)",
  };

  const rawDestinations = [
    { key: "GOOGLE", label: "Google", url: location.reviewLink ?? null },
    { key: "YELP", label: "Yelp", url: location.yelpBusinessUrl ?? null },
    { key: "FACEBOOK", label: "Facebook", url: profile.facebookReviewUrl ?? null },
    { key: "TRUSTPILOT", label: "Trustpilot", url: profile.trustpilotReviewUrl ?? null },
  ].filter((d): d is { key: string; label: string; url: string } => Boolean(d.url));

  const destinations: FunnelDestination[] = rawDestinations.map((d, index) => ({
    id: d.key.toLowerCase(),
    label: d.label,
    url: d.url,
    glyph: DEST_GLYPH[d.key] ?? d.key[0],
    color: DEST_COLOR[d.key] ?? "var(--accent)",
    preferred: index === 0,
    isInternal: false,
  }));

  const aiProps: AiFunnelProps = {
    slug: "",
    locationId: location.id,
    embed: false,
    threshold: profile.negativeFilterThreshold ?? 4,
    internalReviewBase: `/r/${token}`,
    business: {
      name: location.name,
      location: [location.city, location.state].filter(Boolean).join(", "),
      logoUrl: profile.logoUrl ?? null,
      initial: (location.name[0] ?? "?").toUpperCase(),
      hue: 187,
    },
    destinations,
    stoodOut: chips,
    services: profile.services ?? [],
    issues: [],
    ai: {
      reviewEnabled: !!(profile.aiAssistantEnabled && profile.aiAssistantAllowGeneration),
      allowNotes: profile.aiAssistantAllowNotes !== false,
      allowTone: profile.aiAssistantAllowTone !== false,
      allowLength: profile.aiAssistantAllowLength !== false,
      allowRegenerate: profile.aiAssistantAllowRegenerate !== false,
      includeService: profile.aiAssistantIncludeService !== false,
      clarifyEnabled: true,
    },
  };

  return (
    <main>
      <CampaignAiFunnel props={aiProps} token={token} rating={rating} />
    </main>
  );
}
