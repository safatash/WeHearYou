"use server";

import { redirect } from "next/navigation";
import { CampaignStatus, ReviewSource, ReviewStatus, ReviewLinkEventType, ResolutionContactPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/review-link-analytics";
import { classifyPriority } from "@/lib/resolution-priority";
import { summarizeCase } from "@/lib/customer-resolution";
import { notifyResolutionCase } from "@/lib/resolution-notify";

function trimOrNull(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
}

export type ResolutionSubmission = {
  token: string;
  rating: number;
  issueCategories: string[];
  originalFeedback: string;
  aiClearFeedback?: string | null;
  finalFeedback: string;
  requestedOutcome?: string | null;
  contactPreference: "PHONE" | "EMAIL" | "NONE";
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
};

export async function submitResolutionCase(input: ResolutionSubmission): Promise<void> {
  const token = (input.token ?? "").trim();
  const rating = Number(input.rating);
  const finalFeedback = (input.finalFeedback ?? "").trim();

  if (!token || !Number.isInteger(rating) || rating < 1 || rating > 5 || !finalFeedback) {
    redirect(`/r/${token}/resolve?error=invalid`);
  }

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { token },
    include: {
      contact: true,
      campaign: { include: { location: { include: { resolutionSettings: true } } } },
    },
  });
  if (!recipient) {
    redirect(`/r/${token}?error=missing_token`);
  }

  const location = recipient.campaign.location;
  const settings = location.resolutionSettings;
  if (!settings?.enabled) {
    redirect(`/r/${token}/feedback?rating=${rating}`);
  }

  const issueCategories = (input.issueCategories ?? []).filter(Boolean);
  const contactPreference = (["PHONE", "EMAIL", "NONE"].includes(input.contactPreference) ? input.contactPreference : "NONE") as ResolutionContactPreference;
  const contactRequested = contactPreference !== "NONE";
  const customerName = trimOrNull(input.customerName) ?? recipient.contact?.name ?? null;

  const priority = classifyPriority({ issueCategories, feedback: finalFeedback, contactRequested });

  // Linked PRIVATE_FEEDBACK review (keeps the complaint in the Reviews inbox + metrics).
  const review = await prisma.review.create({
    data: {
      locationId: location.id,
      contactId: recipient.contactId,
      source: ReviewSource.INTERNAL,
      reviewerName: customerName || "Anonymous customer",
      rating,
      status: ReviewStatus.PRIVATE_FEEDBACK,
      sentiment: rating <= 2 ? "negative" : "neutral",
      body: finalFeedback,
      reviewedAt: new Date(),
      internalNotes: "Customer Resolution case",
    },
    select: { id: true },
  });

  // Best-effort AI internal summary.
  let aiSummary: string | null = null;
  if (settings.allowAiSummary && process.env.GEMINI_API_KEY) {
    try {
      aiSummary = await summarizeCase({
        rating,
        issueCategories,
        feedback: finalFeedback,
        requestedOutcome: trimOrNull(input.requestedOutcome),
        contactPreference,
        priority,
      });
    } catch {
      aiSummary = null;
    }
  }

  const resolutionCase = await prisma.resolutionCase.create({
    data: {
      organizationId: location.organizationId,
      locationId: location.id,
      campaignRecipientId: recipient.id,
      reviewId: review.id,
      contactId: recipient.contactId,
      rating,
      issueCategories,
      originalFeedback: trimOrNull(input.originalFeedback) ?? finalFeedback,
      aiClearFeedback: trimOrNull(input.aiClearFeedback),
      finalFeedback,
      contactPreference,
      customerName,
      customerEmail: trimOrNull(input.customerEmail) ?? recipient.contact?.email ?? null,
      customerPhone: trimOrNull(input.customerPhone) ?? recipient.contact?.phone ?? null,
      requestedOutcome: trimOrNull(input.requestedOutcome),
      aiSummary,
      priority,
      status: contactRequested ? "NEEDS_RESPONSE" : "NEW",
      notes: {
        create: [
          { kind: "CREATED", body: `Case created from a ${rating}★ review request.` },
          ...(aiSummary ? [{ kind: "AI_SUMMARY", body: aiSummary }] : []),
        ],
      },
    },
    select: { id: true },
  });

  // Best-effort business notification.
  if (settings.notifyOnNewFeedback && (!settings.notifyOnlyHighCritical || priority === "HIGH" || priority === "CRITICAL")) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    await notifyResolutionCase({
      emails: settings.notifyEmails,
      smsRecipients: settings.notifySmsRecipients,
      customerName,
      locationName: location.name,
      rating,
      priority,
      summary: aiSummary ?? finalFeedback.slice(0, 280),
      caseUrl: `${appUrl}/customer-resolution/${resolutionCase.id}`,
    }).catch(() => {});
  }

  const events: ReviewLinkEventType[] = [ReviewLinkEventType.RESOLUTION_FEEDBACK_SUBMITTED, ReviewLinkEventType.RESOLUTION_CASE_CREATED];
  if (contactRequested) events.push(ReviewLinkEventType.RESOLUTION_CONTACT_REQUESTED);
  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: events,
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null },
    clientIp: null,
  }).catch(() => {});

  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: { status: CampaignStatus.COMPLETED, outcome: "Resolution case created", completedAt: new Date() },
  });

  redirect(`/r/${token}/resolve/done?contact=${contactRequested ? "1" : "0"}`);
}
