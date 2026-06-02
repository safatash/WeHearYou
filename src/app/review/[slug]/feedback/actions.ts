"use server";

import { redirect } from "next/navigation";
import { ReviewLinkEventType, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAttribution, recordEvents, isRateLimited } from "@/lib/review-link-analytics";
import { headers } from "next/headers";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitReviewLinkFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const honeypot = String(formData.get("website") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const src = String(formData.get("src") ?? "").trim() || null;
  const medium = String(formData.get("medium") ?? "").trim() || null;
  const placement = String(formData.get("placement") ?? "").trim() || null;
  const sessionId = String(formData.get("sessionId") ?? "").trim() || null;

  const thanksUrl = `/review/${slug}/thanks?${new URLSearchParams({ ...(src ? { src } : {}) }).toString()}`;

  // Honeypot — silently redirect as if successful
  if (honeypot) {
    redirect(thanksUrl);
  }

  if (message.length < 10) {
    redirect(`/review/${slug}/feedback?error=message_too_short&${new URLSearchParams({ ...(src ? { src } : {}), ...(medium ? { medium } : {}), ...(placement ? { placement } : {}) }).toString()}`);
  }

  if (email && !isValidEmail(email)) {
    redirect(`/review/${slug}/feedback?error=invalid_email&${new URLSearchParams({ ...(src ? { src } : {}), ...(medium ? { medium } : {}), ...(placement ? { placement } : {}) }).toString()}`);
  }

  const location = await prisma.location.findFirst({
    where: { slug },
    select: { id: true, organizationId: true },
  });

  if (!location) redirect("/");

  const hdrs = await headers();
  const clientIp = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const rateLimited = await isRateLimited(location.id, clientIp);
  if (rateLimited) {
    redirect(`/review/${slug}/feedback?error=rate_limited`);
  }

  const attr = sanitizeAttribution({ src, medium, placement, sessionId });

  const internalNoteParts: string[] = [`Review link feedback.`];
  if (src) internalNoteParts.push(`Source: ${src}.`);
  if (email) internalNoteParts.push(`Contact email: ${email}.`);

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: ReviewSource.INTERNAL,
      status: ReviewStatus.PRIVATE_FEEDBACK,
      reviewerName: name || "Anonymous",
      body: message,
      rating: null,
      internalNotes: internalNoteParts.join(" "),
      reviewedAt: new Date(),
    },
  });

  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [ReviewLinkEventType.FEEDBACK_SUBMITTED],
    attribution: attr,
    clientIp,
  });

  redirect(thanksUrl);
}
