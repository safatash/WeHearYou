import { prisma } from "@/lib/prisma";
import { publishGbpReply } from "@/lib/gbp-api";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";

export type SendGoogleReplyResult = {
  success: boolean;
  publishedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
};

export async function sendGoogleReviewReply(
  reviewId: string,
  replyText: string
): Promise<SendGoogleReplyResult> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          googleLocationName: true,
          googleConnectionId: true,
        },
      },
    },
  });

  if (!review) {
    return {
      success: false,
      error: "Review not found",
    };
  }

  if (!review.location.googleLocationName) {
    return {
      success: false,
      error: "Google location not connected",
    };
  }

  if (!review.location.googleConnectionId) {
    return {
      success: false,
      error: "Google OAuth connection not found",
    };
  }

  const connection = await prisma.googleAccountConnection.findUnique({
    where: { id: review.location.googleConnectionId },
  });

  if (!connection) {
    return {
      success: false,
      error: "Google connection not found",
    };
  }

  try {
    const accessToken = await getValidGoogleAccessToken({
      id: connection.id,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      scope: connection.scope,
      tokenType: connection.tokenType,
    });

    const reviewName = `${review.location.googleLocationName}/reviews/${review.externalId}`;
    await publishGbpReply(accessToken, reviewName, replyText);

    const publishedAt = new Date();

    return {
      success: true,
      publishedAt,
      metadata: {
        googleLocationName: review.location.googleLocationName,
        reviewId,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      error: errorMessage,
      metadata: {
        googleLocationName: review.location.googleLocationName,
        reviewId,
      },
    };
  }
}
