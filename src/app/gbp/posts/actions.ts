"use server";

import { revalidatePath } from "next/cache";
import { GbpPublishStatus, GbpPostType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getValidGoogleAccessToken, fetchGoogleBusinessLocations } from "@/lib/google-oauth";
import { createGbpPost } from "@/lib/gbp-api";

export async function createGbpPostInline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const locationId = String(formData.get("locationId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postTypeRaw = String(formData.get("postType") ?? "WHATS_NEW").trim().toUpperCase();
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
  const ctaType = String(formData.get("ctaType") ?? "LEARN_MORE").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const publishNow = formData.get("publishNow") === "true";

  if (!locationId || !content) return { success: false, error: "Location and content are required" };

  const postType: GbpPostType =
    postTypeRaw === "OFFER" ? GbpPostType.OFFER :
    postTypeRaw === "EVENT" ? GbpPostType.EVENT :
    GbpPostType.WHATS_NEW;

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const status = publishNow
    ? GbpPublishStatus.DRAFT
    : scheduledAt
    ? GbpPublishStatus.SCHEDULED
    : GbpPublishStatus.DRAFT;

  const locationIds = await getCurrentAccessibleLocationIds();
  if (locationIds.length > 0 && !locationIds.includes(locationId)) {
    return { success: false, error: "Location not found" };
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      googleLocationName: true,
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
    },
  });

  if (!location) return { success: false, error: "Location not found" };

  const callToAction = ctaUrl ? { actionType: ctaType, url: ctaUrl } : null;
  const callToActionJson: Prisma.InputJsonValue | typeof Prisma.DbNull = ctaUrl
    ? { actionType: ctaType, url: ctaUrl }
    : Prisma.DbNull;

  if (publishNow && location.googleConnection && location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);

      // googleLocationName is stored as "locations/xxx" — API needs "accounts/xxx/locations/xxx"
      const googleLocations = await fetchGoogleBusinessLocations(accessToken);
      const matched = googleLocations.find((l) => l.name === location.googleLocationName);
      const fullLocationName = matched?.accountResourceName
        ? `${matched.accountResourceName}/${location.googleLocationName}`
        : location.googleLocationName;

      const gbpPostId = await createGbpPost(accessToken, fullLocationName, {
        postType, content, callToAction, imageUrl,
      });
      await prisma.gbpPost.create({
        data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpPostId },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish";
      await prisma.gbpPost.create({
        data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      revalidatePath("/gbp/posts");
      return { success: false, error: `Published to DB but Google rejected: ${msg}` };
    }
  } else {
    await prisma.gbpPost.create({
      data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status, scheduledAt },
    });
  }

  revalidatePath("/gbp/posts");
  return { success: true };
}
