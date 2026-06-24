"use server";

import { redirect } from "next/navigation";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import {
  resolveHighRating,
  normalizeLowRatingDestination,
  destinationExternalUrl,
  type HighRatingDestination,
} from "@/lib/review-routing";

function trimOrNull(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

async function getLocationBySlug(slug: string) {
  return prisma.location.findFirst({
    where: { slug },
    include: {
      publicProfile: true,
    },
  });
}

export async function submitPublicFunnelRating(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const embed = formData.get("embed") === "1";
  const embedSuffix = embed ? "&embed=1" : "";

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    redirect(`/f/${slug}?error=invalid_rating${embedSuffix}`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location${embedSuffix}`);
  }

  const profile = location.publicProfile;
  const threshold = profile?.negativeFilterThreshold ?? 4;
  const isLow = ratingValue < threshold;

  // ── LOW ratings: recovery only (private feedback or custom recovery URL) ──
  if (isLow) {
    const lowDest = normalizeLowRatingDestination(profile?.lowRatingDestination);
    const recoveryUrl = trimOrNull(profile?.lowRatingCustomUrl);

    // CUSTOM recovery URL takes the customer off-site to the configured page.
    if (lowDest === "CUSTOM" && recoveryUrl) {
      redirect(recoveryUrl);
    }

    // PRIVATE (default / fallback when no custom URL configured).
    if (feedback) {
      const internalNoteParts: string[] = [];
      if (email) internalNoteParts.push(`Contact email: ${email}.`);
      await prisma.review.create({
        data: {
          locationId: location.id,
          source: "INTERNAL",
          reviewerName: name || email || "Anonymous customer",
          rating: ratingValue,
          status: "PRIVATE_FEEDBACK",
          sentiment: ratingValue <= 2 ? "negative" : "neutral",
          body: feedback,
          internalNotes: internalNoteParts.length > 0 ? internalNoteParts.join(" ") : null,
          reviewedAt: new Date(),
        },
      });
      redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private${embedSuffix}`);
    }
    redirect(`/f/${slug}/feedback?rating=${ratingValue}${embedSuffix}`);
  }

  // ── HIGH ratings: one or more public destinations ────────────────────────
  const resolution = resolveHighRating(
    profile?.highRatingMode,
    profile?.highRatingDestinations,
    profile?.highRatingPrimaryDestination,
  );

  if (resolution.kind === "choice") {
    redirect(`/f/${slug}/choose?rating=${ratingValue}${embedSuffix}`);
  }

  // Single destination — go straight there.
  redirectToHighDestination(slug, resolution.destination, ratingValue, embedSuffix, {
    googleReviewLink: location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId),
    facebookReviewUrl: trimOrNull(profile?.facebookReviewUrl),
    customReviewUrl: trimOrNull(profile?.customReviewUrl),
  });
}

/**
 * Redirect a high-rating customer to a single resolved destination.
 * - WEHEARYOU → internal review form.
 * - GOOGLE → existing thanks/handoff page (preserves current behavior).
 * - FACEBOOK / CUSTOM → thanks/handoff page parameterized by destination
 *   (falls back to the Google handoff if no URL is configured).
 */
function redirectToHighDestination(
  slug: string,
  destination: HighRatingDestination,
  rating: number,
  embedSuffix: string,
  ctx: { googleReviewLink: string | null; facebookReviewUrl: string | null; customReviewUrl: string | null },
): never {
  if (destination === "WEHEARYOU") {
    redirect(`/f/${slug}/review?rating=${rating}${embedSuffix}`);
  }
  const externalUrl = destinationExternalUrl(destination, ctx);
  if (destination !== "GOOGLE" && !externalUrl) {
    // No URL configured for Facebook/Custom — fall back to the Google handoff.
    redirect(`/f/${slug}/thanks?rating=${rating}${embedSuffix}`);
  }
  redirect(`/f/${slug}/thanks?rating=${rating}&dest=${destination}${embedSuffix}`);
}

export async function submitPublicPositiveReview(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const reviewedAtStr = String(formData.get("reviewedAt") ?? "").trim();
  const reviewedAt = reviewedAtStr ? new Date(reviewedAtStr) : null;
  const embed = formData.get("embed") === "1";
  const embedSuffix = embed ? "&embed=1" : "";

  // Validate slug, rating, and required review body before creating anything.
  if (
    !slug ||
    !Number.isInteger(ratingValue) ||
    ratingValue < 1 ||
    ratingValue > 5 ||
    !body
  ) {
    redirect(`/f/${slug}/review?rating=${ratingValue || ""}${embedSuffix}&error=invalid_review`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location${embedSuffix}`);
  }

  const internalNoteParts: string[] = [];
  if (email) internalNoteParts.push(`Contact email: ${email}.`);

  // TODO: Handle image upload - currently stored as placeholder
  // In production, upload to S3/cloud storage and store the URL
  let reviewImageUrl: string | null = null;
  const imageFile = formData.get("reviewImage");
  if (imageFile instanceof File && imageFile.size > 0) {
    // For now, we'll store a placeholder
    // In production: upload to S3 and store the URL
    internalNoteParts.push(`Image attached: ${imageFile.name}`);
  }

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: ReviewSource.INTERNAL,
      status: ReviewStatus.PUBLISHED,
      sentiment: "positive",
      rating: ratingValue,
      title: title,
      reviewerName: name || "Anonymous customer",
      body,
      reviewImageUrl,
      reviewedAt: reviewedAt || new Date(),
      internalNotes: internalNoteParts.length > 0 ? internalNoteParts.join(" ") : null,
      publishedExternally: false,
    },
  });

  redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=why-public${embedSuffix}`);
}

export async function submitPublicPrivateFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const embed = formData.get("embed") === "1";
  const embedSuffix = embed ? "&embed=1" : "";

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5 || !feedback) {
    redirect(`/f/${slug}/feedback?rating=${ratingValue || ""}${embedSuffix}&error=invalid_feedback`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location${embedSuffix}`);
  }

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: "INTERNAL",
      reviewerName: contact || "Anonymous customer",
      rating: ratingValue,
      status: "PRIVATE_FEEDBACK",
      sentiment: ratingValue <= 2 ? "negative" : "neutral",
      body: feedback,
      reviewedAt: new Date(),
    },
  });

  redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private${embedSuffix}`);
}

export async function recordPositiveReview(input: {
  slug: string; rating: number; body: string; embed: boolean;
}): Promise<{ ok: boolean }> {
  const rating = Math.round(Number(input.rating));
  const body = (input.body ?? "").trim();
  if (!input.slug || !Number.isInteger(rating) || rating < 1 || rating > 5 || !body) {
    return { ok: false };
  }
  const location = await getLocationBySlug(input.slug);
  if (!location) return { ok: false };

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: ReviewSource.INTERNAL,
      status: ReviewStatus.PUBLISHED,
      sentiment: "positive",
      rating,
      reviewerName: "Anonymous customer",
      body,
      reviewedAt: new Date(),
      publishedExternally: false,
    },
  });
  return { ok: true };
}

export async function recordPrivateFeedback(input: {
  slug: string; rating: number; feedback: string; contact: string; embed: boolean;
}): Promise<{ ok: boolean }> {
  const rating = Math.round(Number(input.rating));
  const feedback = (input.feedback ?? "").trim();
  if (!input.slug || !Number.isInteger(rating) || rating < 1 || rating > 5 || !feedback) {
    return { ok: false };
  }
  const location = await getLocationBySlug(input.slug);
  if (!location) return { ok: false };

  // contact arrives as "" | "no" | "email:<value>" | "phone:<value>"
  const internalNoteParts: string[] = [];
  const [kind, ...rest] = (input.contact ?? "").split(":");
  const contactValue = rest.join(":").trim();
  if (kind === "email" || kind === "phone") {
    internalNoteParts.push(`Customer asked to be contacted by ${kind}${contactValue ? `: ${contactValue}` : ""}.`);
  }

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: "INTERNAL",
      reviewerName: contactValue || "Anonymous customer",
      rating,
      status: "PRIVATE_FEEDBACK",
      sentiment: rating <= 2 ? "negative" : "neutral",
      body: feedback,
      internalNotes: internalNoteParts.length ? internalNoteParts.join(" ") : null,
      reviewedAt: new Date(),
    },
  });
  return { ok: true };
}

export async function getPublicFunnelThanksData(slug: string) {
  const location = await getLocationBySlug(slug);

  if (!location) {
    return null;
  }

  return {
    location,
    reviewLink: location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId),
  };
}
