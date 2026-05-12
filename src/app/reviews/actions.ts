"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireReviewReplyAccess } from "@/lib/authz";

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

  if (markSent) {
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

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      replyDraft,
      replySentAt: markSent ? new Date() : null,
      replySentByMembershipId: markSent ? replySentByMembershipId : null,
    },
  });

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath(`/b/${review.location.slug}`);

  redirect(`/reviews/${reviewId}?flash=${markSent ? "Reply+marked+as+sent" : "Reply+draft+saved"}&tone=success`);
}
