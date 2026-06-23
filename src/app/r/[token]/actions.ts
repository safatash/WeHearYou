"use server";

import { redirect } from "next/navigation";
import { CampaignStatus, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveHighRating, normalizeLowRatingDestination } from "@/lib/review-routing";

function trimOrNull(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

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
  const threshold = profile?.negativeFilterThreshold ?? 4;
  const isThumbsDown = ratingMode === "thumbs" && ratingValue === 1;
  const isHigh = !isThumbsDown && ratingValue >= threshold;
  const openedAt = recipient.openedAt ?? new Date();

  // ── LOW: recovery only (private feedback or custom recovery URL) ─────────
  if (!isHigh) {
    const lowDest = normalizeLowRatingDestination(profile?.lowRatingDestination);
    const recoveryUrl = trimOrNull(profile?.lowRatingCustomUrl);

    if (lowDest === "CUSTOM" && recoveryUrl) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: CampaignStatus.COMPLETED, outcome: "Sent to recovery page", openedAt, completedAt: new Date() },
      });
      redirect(recoveryUrl);
    }

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: CampaignStatus.COMPLETED, outcome: "Private feedback requested", openedAt, completedAt: new Date() },
    });
    redirect(`/r/${token}/feedback?rating=${ratingValue}`);
  }

  // ── HIGH: AI Review Assistant (when enabled) takes over destination choice ─
  if (profile?.aiAssistantEnabled) {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: CampaignStatus.CLICKED, outcome: "Positive rating — AI review assistant", openedAt },
    });
    redirect(`/r/${token}/assist?rating=${ratingValue}`);
  }

  // ── HIGH: one or more public destinations ────────────────────────────────
  const resolution = resolveHighRating(
    profile?.highRatingMode,
    profile?.highRatingDestinations,
    profile?.highRatingPrimaryDestination,
  );

  if (resolution.kind === "choice") {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: CampaignStatus.CLICKED, outcome: "Positive rating — choosing destination", openedAt },
    });
    redirect(`/r/${token}/choose?rating=${ratingValue}`);
  }

  const dest = resolution.destination;
  if (dest === "WEHEARYOU") {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: CampaignStatus.CLICKED, outcome: "Positive rating — WeHearYou review pending", openedAt },
    });
    redirect(`/r/${token}/review?rating=${ratingValue}`);
  }

  // External destination handoff (Google preserves existing semantics).
  const outcome =
    dest === "GOOGLE" ? "Redirected to Google"
    : dest === "FACEBOOK" ? "Redirected to Facebook"
    : "Redirected to custom review page";
  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: { status: CampaignStatus.CLICKED, outcome, openedAt, completedAt: new Date() },
  });
  redirect(`/r/${token}/thanks?rating=${ratingValue}&dest=${dest}`);
}

export async function submitCampaignPositiveReview(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const reviewedAtStr = String(formData.get("reviewedAt") ?? "").trim();
  const reviewedAt = reviewedAtStr ? new Date(reviewedAtStr) : null;

  if (!token || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5 || !body) {
    redirect(`/r/${token}/review?rating=${ratingValue || ""}&error=invalid_review`);
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
    redirect(`/r/${token}?error=missing_recipient`);
  }

  const internalNoteParts: string[] = [];
  if (email) internalNoteParts.push(`Contact email: ${email}.`);

  // TODO: Handle image upload - currently stored as placeholder
  // In production, upload to S3/cloud storage and store the URL
  const reviewImageUrl: string | null = null;
  const imageFile = formData.get("reviewImage");
  if (imageFile instanceof File && imageFile.size > 0) {
    internalNoteParts.push(`Image attached: ${imageFile.name}`);
  }

  await prisma.review.create({
    data: {
      locationId: recipient.campaign.location.id,
      source: ReviewSource.INTERNAL,
      status: ReviewStatus.PUBLISHED,
      sentiment: "positive",
      rating: ratingValue,
      title: title,
      reviewerName: name || "Anonymous customer",
      body,
      reviewImageUrl,
      reviewedAt: reviewedAt || new Date(),
      internalNotes: internalNoteParts.length > 0 ? internalNoteParts.join(" ") : null,
      publishedExternally: false,
    },
  });

  redirect(`/r/${token}/thanks?rating=${ratingValue}&mode=why-public`);
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
