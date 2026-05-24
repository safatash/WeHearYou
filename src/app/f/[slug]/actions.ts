"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";

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

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    redirect(`/f/${slug}?error=invalid_rating`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location`);
  }

  // If feedback is provided, save it as private feedback
  if (feedback && ratingValue < 4) {
    await prisma.review.create({
      data: {
        locationId: location.id,
        source: "INTERNAL",
        reviewerName: "Anonymous customer",
        rating: ratingValue,
        status: "PRIVATE_FEEDBACK",
        sentiment: ratingValue <= 2 ? "negative" : "neutral",
        body: feedback,
        reviewedAt: new Date(),
      },
    });
    redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private`);
  }

  const profile = location.publicProfile;
  const filterEnabled = profile?.negativeFilterEnabled ?? false;
  const threshold = profile?.negativeFilterThreshold ?? 4;

  // Filter OFF: all ratings go to public review (Google)
  // Filter ON: ratings below threshold go to private feedback
  if (!filterEnabled || ratingValue >= threshold) {
    redirect(`/f/${slug}/thanks?rating=${ratingValue}`);
  }

  redirect(`/f/${slug}/feedback?rating=${ratingValue}`);
}

export async function submitPublicPrivateFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5 || !feedback) {
    redirect(`/f/${slug}/feedback?rating=${ratingValue || ""}&error=invalid_feedback`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location`);
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

  redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private`);
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
