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
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    redirect(`/f/${slug}?error=invalid_rating`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location`);
  }

  const profile = location.publicProfile;
  const threshold = profile?.negativeFilterThreshold ?? 4;

  // If feedback is provided for a low rating, save it as private feedback
  if (feedback && ratingValue < threshold) {
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
    redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private`);
  }

  // High ratings (at or above threshold) go to public review handoff
  if (ratingValue >= threshold) {
    redirect(`/f/${slug}/thanks?rating=${ratingValue}`);
  }

  // Low rating with no feedback submitted — redirect to standalone feedback page
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
