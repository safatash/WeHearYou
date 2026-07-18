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

export async function updateGbpPostInline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership) return { success: false, error: "Not authenticated" };

  const postId = String(formData.get("postId") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postTypeRaw = String(formData.get("postType") ?? "WHATS_NEW").trim().toUpperCase();
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
  const ctaType = String(formData.get("ctaType") ?? "LEARN_MORE").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const publishNow = formData.get("publishNow") === "true";

  if (!postId || !content) return { success: false, error: "Post ID and content are required" };

  const postType: GbpPostType =
    postTypeRaw === "OFFER" ? GbpPostType.OFFER :
    postTypeRaw === "EVENT" ? GbpPostType.EVENT :
    GbpPostType.WHATS_NEW;

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const callToActionJson: Prisma.InputJsonValue | typeof Prisma.DbNull = ctaUrl
    ? { actionType: ctaType, url: ctaUrl }
    : Prisma.DbNull;

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
      const googleLocations = await fetchGoogleBusinessLocations(accessToken);
      const matched = googleLocations.find((l) => l.name === post.location.googleLocationName);
      const fullLocationName = matched?.accountResourceName
        ? `${matched.accountResourceName}/${post.location.googleLocationName}`
        : post.location.googleLocationName;

      if (post.gbpPostId) {
        try { await deleteGbpPost(accessToken, post.gbpPostId); } catch {}
      }

      const callToAction = ctaUrl ? { actionType: ctaType, url: ctaUrl } : null;
      const gbpPostId = await createGbpPost(accessToken, fullLocationName, {
        postType, content, callToAction, imageUrl,
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
