import { GbpPostType, GbpPublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { createGbpPost, deleteGbpPost, uploadGbpPhoto } from "@/lib/gbp-api";

type SchedulerResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

export async function runGbpScheduler(): Promise<SchedulerResult> {
  const now = new Date();
  let succeeded = 0;
  let failed = 0;

  // --- Process scheduled GbpPosts ---
  const duePosts = await prisma.gbpPost.findMany({
    where: { status: GbpPublishStatus.SCHEDULED, scheduledAt: { lte: now } },
    include: {
      location: {
        select: { googleLocationName: true, googleConnectionId: true, id: true },
      },
    },
    take: 50,
  });

  for (const post of duePosts) {
    const conn = post.location.googleConnectionId
      ? await prisma.googleAccountConnection.findUnique({
          where: { id: post.location.googleConnectionId },
          select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
        })
      : null;

    if (!conn || !post.location.googleLocationName) {
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: "No Google connection or location name" },
      });
      failed++;
      continue;
    }

    try {
      const accessToken = await getValidGoogleAccessToken(conn);
      const callToAction =
        post.callToAction && typeof post.callToAction === "object" && !Array.isArray(post.callToAction)
          ? (post.callToAction as { actionType?: string; url?: string })
          : null;

      const gbpPostId = await createGbpPost(accessToken, post.location.googleLocationName, {
        postType: post.postType,
        content: post.content,
        callToAction: callToAction?.url ? { actionType: callToAction.actionType ?? "LEARN_MORE", url: callToAction.url } : null,
        imageUrl: post.imageUrl,
      });

      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpPostId, failureReason: null },
      });
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      failed++;
    }
  }

  // --- Process scheduled GbpPhotos ---
  const duePhotos = await prisma.gbpPhoto.findMany({
    where: { status: GbpPublishStatus.SCHEDULED, scheduledAt: { lte: now } },
    include: {
      location: {
        select: { googleLocationName: true, googleConnectionId: true, id: true },
      },
    },
    take: 50,
  });

  for (const photo of duePhotos) {
    const conn = photo.location.googleConnectionId
      ? await prisma.googleAccountConnection.findUnique({
          where: { id: photo.location.googleConnectionId },
          select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
        })
      : null;

    if (!conn || !photo.location.googleLocationName) {
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: "No Google connection or location name" },
      });
      failed++;
      continue;
    }

    try {
      const accessToken = await getValidGoogleAccessToken(conn);
      const gbpMediaId = await uploadGbpPhoto(accessToken, photo.location.googleLocationName, photo.storageUrl, photo.category);
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpMediaId, failureReason: null },
      });
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      failed++;
    }
  }

  // --- Expire offer posts past their end date ---
  const publishedOffers = await prisma.gbpPost.findMany({
    where: { status: GbpPublishStatus.PUBLISHED, postType: GbpPostType.OFFER },
    include: {
      location: {
        select: { googleLocationName: true, googleConnectionId: true, id: true },
      },
    },
    take: 100,
  });

  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  for (const post of publishedOffers) {
    const cta = post.callToAction as Record<string, unknown> | null;
    const endDate = typeof cta?.offerEndDate === "string" ? cta.offerEndDate : null;
    if (!endDate || endDate >= todayStr) continue;

    // Try to delete from Google; ignore errors (post may already be gone)
    if (post.gbpPostId && post.location.googleConnectionId) {
      try {
        const conn = await prisma.googleAccountConnection.findUnique({
          where: { id: post.location.googleConnectionId },
          select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
        });
        if (conn) {
          const accessToken = await getValidGoogleAccessToken(conn);
          await deleteGbpPost(accessToken, post.gbpPostId);
        }
      } catch {
        // Best-effort; mark expired regardless
      }
    }

    await prisma.gbpPost.update({
      where: { id: post.id },
      data: { status: GbpPublishStatus.EXPIRED },
    });
  }

  return { processed: duePosts.length + duePhotos.length, succeeded, failed };
}
