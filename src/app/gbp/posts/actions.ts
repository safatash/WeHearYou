"use server";

import { revalidatePath } from "next/cache";
import { GbpPublishStatus, GbpPostType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getValidGoogleAccessToken, fetchGoogleBusinessLocations } from "@/lib/google-oauth";
import { createGbpPost, deleteGbpPost } from "@/lib/gbp-api";

const GOOGLE_CONNECTION_SELECT = {
  id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true,
} as const;

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function extractPostFields(formData: FormData) {
  const ctaUrl = str(formData, "ctaUrl");
  const ctaType = str(formData, "ctaType") || "LEARN_MORE";
  const eventTitle = str(formData, "title");
  const offerCouponCode = str(formData, "offerCouponCode");
  const offerRedeemUrl = str(formData, "offerRedeemUrl");
  const offerTerms = str(formData, "offerTerms");
  const offerStartDate = str(formData, "offerStartDate");
  const offerStartTime = str(formData, "offerStartTime");
  const offerEndDate = str(formData, "offerEndDate");
  const offerEndTime = str(formData, "offerEndTime");

  const ctaForApi = ctaUrl ? { actionType: ctaType, url: ctaUrl } : null;

  // Store everything in the callToAction JSON blob (no migration needed)
  const stored: Record<string, unknown> = {};
  if (ctaUrl) { stored.actionType = ctaType; stored.url = ctaUrl; }
  if (eventTitle) stored.eventTitle = eventTitle;
  if (offerCouponCode) stored.offerCouponCode = offerCouponCode;
  if (offerRedeemUrl) stored.offerRedeemUrl = offerRedeemUrl;
  if (offerTerms) stored.offerTerms = offerTerms;
  if (offerStartDate) stored.offerStartDate = offerStartDate;
  if (offerStartTime) stored.offerStartTime = offerStartTime;
  if (offerEndDate) stored.offerEndDate = offerEndDate;
  if (offerEndTime) stored.offerEndTime = offerEndTime;

  const callToActionJson: Prisma.InputJsonValue | typeof Prisma.DbNull =
    Object.keys(stored).length > 0 ? (stored as Prisma.InputJsonValue) : Prisma.DbNull;

  return { ctaForApi, callToActionJson, eventTitle, offerCouponCode, offerRedeemUrl, offerTerms, offerStartDate, offerStartTime, offerEndDate, offerEndTime };
}

async function resolveFullLocationName(accessToken: string, googleLocationName: string) {
  const googleLocations = await fetchGoogleBusinessLocations(accessToken);
  const matched = googleLocations.find((l) => l.name === googleLocationName);
  return matched?.accountResourceName
    ? `${matched.accountResourceName}/${googleLocationName}`
    : googleLocationName;
}

export async function createGbpPostInline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const locationId = str(formData, "locationId");
  const content = str(formData, "content");
  const postTypeRaw = str(formData, "postType").toUpperCase() || "WHATS_NEW";
  const imageUrl = str(formData, "imageUrl") || null;
  const scheduledAtRaw = str(formData, "scheduledAt");
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

  const { ctaForApi, callToActionJson, eventTitle, offerCouponCode, offerRedeemUrl, offerTerms, offerStartDate, offerStartTime, offerEndDate, offerEndTime } = extractPostFields(formData);

  if (publishNow && location.googleConnection && location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const fullLocationName = await resolveFullLocationName(accessToken, location.googleLocationName);

      const gbpPostId = await createGbpPost(accessToken, fullLocationName, {
        postType, content, callToAction: ctaForApi, imageUrl,
        eventTitle, offerCouponCode, offerRedeemUrl, offerTerms,
        offerStartDate, offerStartTime, offerEndDate, offerEndTime,
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

export async function updateGbpPostInline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const postId = str(formData, "postId");
  const locationId = str(formData, "locationId");
  const content = str(formData, "content");
  const postTypeRaw = str(formData, "postType").toUpperCase() || "WHATS_NEW";
  const imageUrl = str(formData, "imageUrl") || null;
  const scheduledAtRaw = str(formData, "scheduledAt");
  const publishNow = formData.get("publishNow") === "true";

  if (!postId || !content) return { success: false, error: "Post ID and content are required" };

  const postType: GbpPostType =
    postTypeRaw === "OFFER" ? GbpPostType.OFFER :
    postTypeRaw === "EVENT" ? GbpPostType.EVENT :
    GbpPostType.WHATS_NEW;

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const { ctaForApi, callToActionJson, eventTitle, offerCouponCode, offerRedeemUrl, offerTerms, offerStartDate, offerStartTime, offerEndDate, offerEndTime } = extractPostFields(formData);

  const locationIds = await getCurrentAccessibleLocationIds();
  const post = await prisma.gbpPost.findFirst({
    where: { id: postId, ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}) },
    include: {
      location: {
        select: { googleLocationName: true, googleConnection: { select: GOOGLE_CONNECTION_SELECT } },
      },
    },
  });
  if (!post) return { success: false, error: "Post not found" };

  if (publishNow && post.location.googleConnection && post.location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(post.location.googleConnection);
      const fullLocationName = await resolveFullLocationName(accessToken, post.location.googleLocationName);

      if (post.gbpPostId) {
        try { await deleteGbpPost(accessToken, post.gbpPostId); } catch {}
      }

      const gbpPostId = await createGbpPost(accessToken, fullLocationName, {
        postType, content, callToAction: ctaForApi, imageUrl,
        eventTitle, offerCouponCode, offerRedeemUrl, offerTerms,
        offerStartDate, offerStartTime, offerEndDate, offerEndTime,
      });
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpPostId, failureReason: null },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish";
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      revalidatePath("/gbp/posts");
      return { success: false, error: `Saved but Google rejected: ${msg}` };
    }
  } else {
    const status = scheduledAt ? GbpPublishStatus.SCHEDULED : GbpPublishStatus.DRAFT;
    await prisma.gbpPost.update({
      where: { id: post.id },
      data: { locationId, postType, content, callToAction: callToActionJson, imageUrl, status, scheduledAt },
    });
  }

  revalidatePath("/gbp/posts");
  return { success: true };
}

export async function deleteGbpPostInline(postId: string): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const post = await prisma.gbpPost.findFirst({
    where: { id: postId, ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}) },
    include: {
      location: {
        select: { googleLocationName: true, googleConnection: { select: GOOGLE_CONNECTION_SELECT } },
      },
    },
  });
  if (!post) return { success: false, error: "Post not found" };

  if (post.gbpPostId && post.location.googleConnection) {
    try {
      const accessToken = await getValidGoogleAccessToken(post.location.googleConnection);
      await deleteGbpPost(accessToken, post.gbpPostId);
    } catch {}
  }

  await prisma.gbpPost.delete({ where: { id: post.id } });
  revalidatePath("/gbp/posts");
  return { success: true };
}

export async function duplicateGbpPostInline(postId: string): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const post = await prisma.gbpPost.findFirst({
    where: { id: postId, ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}) },
    select: { postType: true, content: true, imageUrl: true, callToAction: true, locationId: true },
  });
  if (!post) return { success: false, error: "Post not found" };

  const cta = post.callToAction as Prisma.InputJsonValue | null;
  await prisma.gbpPost.create({
    data: {
      locationId: post.locationId,
      postType: post.postType,
      content: post.content,
      imageUrl: post.imageUrl,
      callToAction: cta ?? Prisma.DbNull,
      status: GbpPublishStatus.DRAFT,
    },
  });

  revalidatePath("/gbp/posts");
  return { success: true };
}
