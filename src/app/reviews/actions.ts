"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireReviewReplyAccess } from "@/lib/authz";
import { generateReplyDraft } from "@/lib/ai-reply";
import { classifyReviewSafety } from "@/lib/review-safety";
import { sendGoogleReviewReply } from "@/lib/google-reply";
import { logReplyAudit } from "@/lib/reply-audit";
import { tryAutoSendGoogleReplyForReview } from "@/lib/auto-send-reply";

export async function updateReviewWorkflow(formData: FormData) {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();

  if (!reviewId || !intent) {
    throw new Error("Review and action are required");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  await requireReviewReplyAccess(review.locationId);

  if (intent === "mark-follow-up") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "NEEDS_FOLLOW_UP",
      },
    });
  } else if (intent === "mark-private") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "PRIVATE_FEEDBACK",
      },
    });
  } else if (intent === "mark-published") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "PUBLISHED",
      },
    });
  } else if (intent === "toggle-testimonial") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        isTestimonial: !review.isTestimonial,
        isWidgetVisible: !review.isTestimonial ? true : review.isWidgetVisible,
      },
    });
  } else if (intent === "toggle-widget") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        isWidgetVisible: !review.isWidgetVisible,
      },
    });
  } else if (intent === "toggle-featured") {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        isFeatured: !review.isFeatured,
      },
    });
  } else {
    throw new Error("Unknown review workflow action");
  }

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/b/${review.location.slug}`);

  redirect(`/reviews/${reviewId}?flash=Review+workflow+updated&tone=success`);
}

export async function saveReviewFollowUp(formData: FormData) {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const ownerMembershipId = String(formData.get("ownerMembershipId") ?? "").trim() || null;
  const internalNotes = String(formData.get("internalNotes") ?? "").trim() || null;

  if (!reviewId) {
    throw new Error("Review is required");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  await requireReviewReplyAccess(review.locationId);

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      ownerMembershipId,
      internalNotes,
    },
  });

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/b/${review.location.slug}`);

  redirect(`/reviews/${reviewId}?flash=Follow-up+saved&tone=success`);
}

export async function saveReviewReply(formData: FormData) {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const replyDraft = String(formData.get("replyDraft") ?? "").trim() || null;
  const markSent = String(formData.get("markSent") ?? "").trim() === "true";
  const sendToGoogle = String(formData.get("sendToGoogle") ?? "").trim() === "true";

  if (!reviewId) {
    throw new Error("Review is required");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          slug: true,
          organizationId: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  await requireReviewReplyAccess(review.locationId);

  let replySentByMembershipId = review.replySentByMembershipId;
  let replyPublishedAt = review.replyPublishedAt;

  if (markSent && review.source === "INTERNAL") {
    // For INTERNAL reviews, publish the reply
    const fallbackSender = await prisma.userMembership.findFirst({
      where: {
        organizationId: review.location.organizationId,
        status: "ACTIVE",
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    replySentByMembershipId = fallbackSender?.id ?? null;
    replyPublishedAt = new Date();
  } else if (markSent && review.source !== "INTERNAL" && !sendToGoogle) {
    // For non-INTERNAL reviews without Google send, just mark as sent
    const fallbackSender = await prisma.userMembership.findFirst({
      where: {
        organizationId: review.location.organizationId,
        status: "ACTIVE",
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    replySentByMembershipId = fallbackSender?.id ?? null;
  }

  // Handle Google send (only if flag is set)
  if (sendToGoogle && markSent && review.source === "GOOGLE") {
    if (!replyDraft) {
      throw new Error("Reply text is required to send to Google");
    }

    // Check safety
    const safety = classifyReviewSafety(replyDraft);
    if (safety.isRisky) {
      await logReplyAudit({
        reviewId,
        locationId: review.locationId,
        action: "SAFETY_BLOCKED",
        resultStatus: "BLOCKED",
        draftText: replyDraft,
        safetyClassification: safety,
      });
      throw new Error(`Safety check failed: ${safety.reason}`);
    }

    // Send to Google
    const sendResult = await sendGoogleReviewReply(reviewId, replyDraft);
    if (!sendResult.success) {
      await logReplyAudit({
        reviewId,
        locationId: review.locationId,
        action: "FAILED",
        resultStatus: "FAILED",
        draftText: replyDraft,
        errorMessage: sendResult.error,
        metadata: sendResult.metadata,
      });
      throw new Error(sendResult.error || "Failed to send reply to Google");
    }

    // Update review with sent info
    const fallbackSender = await prisma.userMembership.findFirst({
      where: {
        organizationId: review.location.organizationId,
        status: "ACTIVE",
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    replySentByMembershipId = fallbackSender?.id ?? null;

    await logReplyAudit({
      reviewId,
      locationId: review.locationId,
      action: "SENT_TO_GOOGLE",
      resultStatus: "SUCCESS",
      draftText: replyDraft,
      metadata: sendResult.metadata,
    });

    // Update review with Google send info
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        replyDraft,
        sourceReplyText: replyDraft,
        replySentAt: sendResult.publishedAt,
        replySentByMembershipId,
      },
    });

    revalidatePath("/reviews");
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath(`/b/${review.location.slug}`);

    redirect(`/reviews/${reviewId}?flash=Reply+sent+to+Google&tone=success`);
  }

  // Standard save for INTERNAL or draft-only updates
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      replyDraft,
      replyPublishedAt: markSent && review.source === "INTERNAL" ? replyPublishedAt : undefined,
      replySentAt: markSent && review.source !== "INTERNAL" ? new Date() : undefined,
      replySentByMembershipId: markSent ? replySentByMembershipId : undefined,
    },
  });

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/b/${review.location.slug}`);

  const flashMessage = markSent
    ? (review.source === "INTERNAL" ? "Reply+published" : "Reply+marked+as+sent")
    : "Reply+draft+saved";

  redirect(`/reviews/${reviewId}?flash=${flashMessage}&tone=success`);
}

export async function generateAiReplyDraft(reviewId: string, tone?: string): Promise<{ success: boolean; draft?: string; error?: string }> {
  if (!reviewId) {
    return { success: false, error: "Review ID is required" };
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
          organizationId: true,
        },
      },
    },
  });

  if (!review) {
    return { success: false, error: "Review not found" };
  }

  await requireReviewReplyAccess(review.locationId);

  if (!review.rating) {
    return { success: false, error: "Review rating is required for AI draft generation" };
  }

  try {
    const draft = await generateReplyDraft({
      reviewerName: review.reviewerName,
      rating: review.rating,
      body: review.body,
      tone,
    });

    // Log the draft generation
    await logReplyAudit({
      reviewId,
      locationId: review.locationId,
      action: "DRAFT_GENERATED",
      resultStatus: "SUCCESS",
      draftText: draft,
    });

    return { success: true, draft };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate draft";

    await logReplyAudit({
      reviewId,
      locationId: review.locationId,
      action: "DRAFT_GENERATED",
      resultStatus: "FAILED",
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

export async function deleteReview(reviewId: string) {
  if (!reviewId) {
    throw new Error("Review ID is required");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  await requireReviewReplyAccess(review.locationId);

  await prisma.review.delete({
    where: { id: reviewId },
  });

  revalidatePath("/reviews");
  revalidatePath(`/b/${review.location.slug}`);

  return { success: true };
}

export async function saveReviewReplyInline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const replyDraft = String(formData.get("replyDraft") ?? "").trim() || null;

  if (!reviewId) return { success: false, error: "Review is required" };

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: {
        select: { slug: true, organizationId: true },
      },
    },
  });

  if (!review) return { success: false, error: "Review not found" };

  await requireReviewReplyAccess(review.locationId);

  const fallbackSender = await prisma.userMembership.findFirst({
    where: { organizationId: review.location.organizationId, status: "ACTIVE" },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });

  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        replyDraft,
        replySentAt: new Date(),
        replySentByMembershipId: fallbackSender?.id ?? null,
      },
    });

    revalidatePath("/reviews");
    revalidatePath(`/reviews/${reviewId}`);
    revalidatePath(`/b/${review.location.slug}`);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save reply" };
  }
}

// Re-export for use in server actions
export { tryAutoSendGoogleReplyForReview as tryAutoSendGoogleReply };
