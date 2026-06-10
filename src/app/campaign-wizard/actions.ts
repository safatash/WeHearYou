"use server";

import { prisma } from "@/lib/prisma";
import { requireLocationAccess } from "@/lib/authz";
import { isPositiveReviewDestination, DEFAULT_POSITIVE_REVIEW_DESTINATION } from "@/lib/positive-review-destination";

export async function saveCampaignWizard(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const funnelRatingStyle = String(formData.get("funnelRatingStyle") ?? "stars").trim() || "stars";
  const funnelPromptTitle = String(formData.get("funnelPromptTitle") ?? "").trim() || null;
  const funnelPromptBody = String(formData.get("funnelPromptBody") ?? "").trim() || null;
  const negativeFilterEnabled = formData.get("negativeFilterEnabled") === "true";
  const negativeFilterThreshold = Number(formData.get("negativeFilterThreshold") ?? 4);

  const positiveRaw = String(formData.get("positiveReviewDestination") ?? "").trim();
  const positiveReviewDestination = isPositiveReviewDestination(positiveRaw)
    ? positiveRaw
    : DEFAULT_POSITIVE_REVIEW_DESTINATION;

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      funnelRatingStyle,
      funnelPromptTitle,
      funnelPromptBody,
      negativeFilterEnabled,
      negativeFilterThreshold: isNaN(negativeFilterThreshold) ? 4 : negativeFilterThreshold,
      positiveReviewDestination,
    },
    create: {
      locationId,
      funnelRatingStyle,
      funnelPromptTitle,
      funnelPromptBody,
      negativeFilterEnabled,
      negativeFilterThreshold: isNaN(negativeFilterThreshold) ? 4 : negativeFilterThreshold,
      positiveReviewDestination,
    },
  });

  return { success: true };
}
