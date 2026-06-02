"use server";

import { redirect } from "next/navigation";
import { CampaignStatus, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function submitReviewRating(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const ratingMode = String(formData.get("ratingMode") ?? "").trim();

  if (!token || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    redirect(`/r/${token}?error=invalid_rating`);
  }

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { token },
    include: {
      contact: true,
      campaign: {
        include: {
          location: {
            include: {
              publicProfile: true,
            },
          },
        },
      },
    },
  });

  if (!recipient) {
    redirect(`/r/${token}?error=missing_token`);
  }
  if (recipient.revokedAt) {
    redirect(`/r/${token}?error=revoked`);
  }
  if (recipient.expiresAt && recipient.expiresAt < new Date()) {
    redirect(`/r/${token}?error=expired`);
  }

  const profile = recipient.campaign.location.publicProfile;
  const filterEnabled = profile?.negativeFilterEnabled ?? false;
  const filterThreshold = profile?.negativeFilterThreshold ?? 4;
  const isThumbsDown = ratingMode === "thumbs" && ratingValue === 1;
  const highRating = !isThumbsDown && (!filterEnabled || ratingValue >= filterThreshold);

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      status: highRating ? CampaignStatus.CLICKED : CampaignStatus.COMPLETED,
      outcome: highRating ? "Redirected to Google" : "Private feedback requested",
      openedAt: recipient.openedAt ?? new Date(),
      completedAt: new Date(),
    },
  });

  if (highRating) {
    redirect(`/r/${token}/thanks?rating=${ratingValue}`);
  }

  redirect(`/r/${token}/feedback?rating=${ratingValue}`);
}

export async function submitPrivateFeedback(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!token || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5 || !feedback) {
    redirect(`/r/${token}/feedback?error=invalid_feedback`);
  }

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { token },
    include: {
      contact: true,
      campaign: {
        include: {
          location: true,
        },
      },
    },
  });

  if (!recipient) {
    redirect(`/r/${token}?error=missing_token`);
  }
  if (recipient.revokedAt) {
    redirect(`/r/${token}?error=revoked`);
  }
  if (recipient.expiresAt && recipient.expiresAt < new Date()) {
    redirect(`/r/${token}?error=expired`);
  }

  await prisma.review.create({
    data: {
      locationId: recipient.campaign.locationId,
      contactId: recipient.contactId,
      source: ReviewSource.INTERNAL,
      reviewerName: recipient.contact.name,
      rating: ratingValue,
      status: ReviewStatus.PRIVATE_FEEDBACK,
      sentiment: ratingValue <= 2 ? "negative" : "neutral",
      body: feedback,
      reviewedAt: new Date(),
    },
  });

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      status: CampaignStatus.COMPLETED,
      outcome: "Private feedback captured",
      completedAt: new Date(),
    },
  });

  redirect(`/r/${token}/thanks?rating=${ratingValue}&mode=private`);
}
