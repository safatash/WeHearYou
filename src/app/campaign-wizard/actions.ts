"use server";

import { prisma } from "@/lib/prisma";
import { requireLocationAccess } from "@/lib/authz";

export async function saveCampaignWizard(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const funnelRatingStyle = String(formData.get("funnelRatingStyle") ?? "stars").trim() || "stars";
  const funnelPromptTitle = String(formData.get("funnelPromptTitle") ?? "").trim() || null;
  const funnelPromptBody = String(formData.get("funnelPromptBody") ?? "").trim() || null;
  const negativeFilterEnabled = formData.get("negativeFilterEnabled") === "true";
  const negativeFilterThreshold = Number(formData.get("negativeFilterThreshold") ?? 4);

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      funnelRatingStyle,
      funnelPromptTitle,
      funnelPromptBody,
      negativeFilterEnabled,
      negativeFilterThreshold: isNaN(negativeFilterThreshold) ? 4 : negativeFilterThreshold,
    },
    create: {
      locationId,
      funnelRatingStyle,
      funnelPromptTitle,
      funnelPromptBody,
      negativeFilterEnabled,
      negativeFilterThreshold: isNaN(negativeFilterThreshold) ? 4 : negativeFilterThreshold,
    },
  });

  return { success: true };
}
