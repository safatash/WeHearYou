"use server";

import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { GbpPublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { publishGbpReply, deleteGbpPost, uploadGbpPhoto, deleteGbpPhoto, answerGbpQuestion } from "@/lib/gbp-api";
import { resolveGbpLocationName } from "@/lib/gbp-location-name";

async function getLocationWithConnection(locationId: string, allowedIds: string[]) {
  if (allowedIds.length > 0 && !allowedIds.includes(locationId)) return null;
  return prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      googleLocationName: true,
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
    },
  });
}

export async function publishGbpReplyAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const replyText = String(formData.get("replyText") ?? "").trim();
  if (!reviewId || !replyText) return { error: "Missing fields" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    select: { id: true, externalId: true, locationId: true, replyPublishedAt: true },
  });
  if (!review) return { error: "Review not found" };
  if (review.replyPublishedAt) return { error: "Reply already published" };

  const location = await getLocationWithConnection(review.locationId, locationIds);
  if (!location?.googleConnection || !location.googleLocationName) {
    return { error: "Location is not connected to Google Business Profile" };
  }
  if (!review.externalId) return { error: "Review has no Google ID" };

  try {
    const accessToken = await getValidGoogleAccessToken(location.googleConnection);
    const reviewName = `${location.googleLocationName}/reviews/${review.externalId}`;
    await publishGbpReply(accessToken, reviewName, replyText);
    await prisma.review.update({
      where: { id: review.id },
      data: { replyDraft: replyText, replyPublishedAt: new Date(), replyGbpId: reviewName },
    });
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to publish reply" };
  }
}

export async function deleteGbpPostAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const postId = String(formData.get("postId") ?? "").trim();
  const locationIds = await getCurrentAccessibleLocationIds();

  const post = await prisma.gbpPost.findFirst({
    where: {
      id: postId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: { googleLocationName: true, googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } } },
      },
    },
  });
  if (!post) return { error: "Post not found" };

  if (post.gbpPostId && post.location.googleConnection) {
    try {
      const accessToken = await getValidGoogleAccessToken(post.location.googleConnection);
      await deleteGbpPost(accessToken, post.gbpPostId);
    } catch {
      // Best-effort delete
    }
  }

  await prisma.gbpPost.delete({ where: { id: post.id } });
  redirect("/gbp/posts");
}

export async function uploadGbpPhotoAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const locationId = String(formData.get("locationId") ?? "").trim();
  const category = String(formData.get("category") ?? "ADDITIONAL").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const publishNow = formData.get("publishNow") === "true";
  const photoFile = formData.get("photo") as File | null;

  if (!locationId || !photoFile || photoFile.size === 0) redirect("/gbp/photos?error=missing_fields");

  const locationIds = await getCurrentAccessibleLocationIds();
  const location = await getLocationWithConnection(locationId, locationIds);
  if (!location) redirect("/gbp/photos?error=not_found");

  const blobName = `gbp-photos/${locationId}/${Date.now()}-${photoFile.name}`;
  const blob = await put(blobName, photoFile, {
    access: "public",
    token: process.env.BLOB_Public_READ_WRITE_TOKEN,
  });

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const status = publishNow ? GbpPublishStatus.DRAFT : (scheduledAt ? GbpPublishStatus.SCHEDULED : GbpPublishStatus.DRAFT);

  if (publishNow && location.googleConnection && location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const fullLocationName = await resolveGbpLocationName(accessToken, location.googleLocationName);
      const gbpMediaId = await uploadGbpPhoto(accessToken, fullLocationName, blob.url, category);
      await prisma.gbpPhoto.create({
        data: { locationId, storageUrl: blob.url, category, status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpMediaId },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish";
      await prisma.gbpPhoto.create({
        data: { locationId, storageUrl: blob.url, category, status: GbpPublishStatus.FAILED, failureReason: msg },
      });
    }
  } else {
    await prisma.gbpPhoto.create({
      data: { locationId, storageUrl: blob.url, category, status, scheduledAt },
    });
  }

  redirect("/gbp/photos");
}

export async function deleteGbpPhotoAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const photoId = String(formData.get("photoId") ?? "").trim();
  const locationIds = await getCurrentAccessibleLocationIds();

  const photo = await prisma.gbpPhoto.findFirst({
    where: {
      id: photoId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: { googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } } },
      },
    },
  });
  if (!photo) return { error: "Photo not found" };

  if (photo.gbpMediaId && photo.location.googleConnection) {
    try {
      const accessToken = await getValidGoogleAccessToken(photo.location.googleConnection);
      await deleteGbpPhoto(accessToken, photo.gbpMediaId);
    } catch {
      // Best-effort
    }
  }

  await prisma.gbpPhoto.delete({ where: { id: photo.id } });
  redirect("/gbp/photos");
}

export async function answerGbpQuestionAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const questionId = String(formData.get("questionId") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim();
  if (!questionId || !answerText) return { error: "Missing fields" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const question = await prisma.gbpQuestion.findFirst({
    where: {
      id: questionId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: {
          googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } },
        },
      },
    },
  });
  if (!question) return { error: "Question not found" };
  if (!question.location.googleConnection) return { error: "Location not connected to Google" };

  try {
    const accessToken = await getValidGoogleAccessToken(question.location.googleConnection);
    const answerId = await answerGbpQuestion(accessToken, question.gbpQuestionId, answerText);
    await prisma.gbpQuestion.update({
      where: { id: question.id },
      data: { answerText, answeredAt: new Date(), gbpAnswerId: answerId },
    });
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to post answer" };
  }
}
