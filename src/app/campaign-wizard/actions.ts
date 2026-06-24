"use server";

import { prisma } from "@/lib/prisma";
import { requireLocationAccess } from "@/lib/authz";
import {
  normalizeLowRatingDestination,
  normalizeHighRatingDestinations,
  normalizeHighRatingMode,
  isHighRatingDestination,
} from "@/lib/review-routing";
import { readFunnelStyleField } from "./funnel-style-field";

function trimOrNull(value: FormDataEntryValue | null) {
  const v = (typeof value === "string" ? value : "").trim();
  return v.length > 0 ? v : null;
}

export async function saveCampaignWizard(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const funnelStyle = readFunnelStyleField(formData);
  const funnelRatingStyle = String(formData.get("funnelRatingStyle") ?? "stars").trim() || "stars";
  const funnelPromptTitle = trimOrNull(formData.get("funnelPromptTitle"));
  const funnelPromptBody = trimOrNull(formData.get("funnelPromptBody"));
  const negativeFilterEnabled = formData.get("negativeFilterEnabled") === "true";
  const negativeFilterThreshold = Number(formData.get("negativeFilterThreshold") ?? 4);

  // Review routing
  const lowRatingDestination = normalizeLowRatingDestination(formData.get("lowRatingDestination"));
  const lowRatingCustomUrl = trimOrNull(formData.get("lowRatingCustomUrl"));
  const highRatingDestinations = normalizeHighRatingDestinations(
    formData.getAll("highRatingDestinations").map((v) => String(v)),
  );
  const highRatingMode = normalizeHighRatingMode(formData.get("highRatingMode"));
  const primaryRaw = trimOrNull(formData.get("highRatingPrimaryDestination"));
  const highRatingPrimaryDestination =
    primaryRaw && isHighRatingDestination(primaryRaw) && highRatingDestinations.includes(primaryRaw)
      ? primaryRaw
      : null;
  const facebookReviewUrl = trimOrNull(formData.get("facebookReviewUrl"));
  const customReviewUrl = trimOrNull(formData.get("customReviewUrl"));

  const data = {
    funnelStyle,
    funnelRatingStyle,
    funnelPromptTitle,
    funnelPromptBody,
    negativeFilterEnabled,
    negativeFilterThreshold: isNaN(negativeFilterThreshold) ? 4 : negativeFilterThreshold,
    lowRatingDestination,
    lowRatingCustomUrl,
    highRatingDestinations,
    highRatingMode,
    highRatingPrimaryDestination,
    facebookReviewUrl,
    customReviewUrl,
  };

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: data,
    create: { locationId, ...data },
  });

  return { success: true };
}
