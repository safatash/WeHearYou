"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ResolutionStatus, ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, requireLocationAccess } from "@/lib/authz";
import { recordEvents } from "@/lib/review-link-analytics";
import { draftCaseResponse } from "@/lib/customer-resolution";
import { Resend } from "resend";
import { sendSMS, isSMSSendingConfigured } from "@/lib/sms";

const VALID_STATUSES: ResolutionStatus[] = [
  ResolutionStatus.NEW, ResolutionStatus.NEEDS_RESPONSE, ResolutionStatus.CONTACTED,
  ResolutionStatus.IN_PROGRESS, ResolutionStatus.RESOLVED, ResolutionStatus.CLOSED,
];

async function loadCase(caseId: string) {
  const c = await prisma.resolutionCase.findUnique({
    where: { id: caseId },
    include: { location: { select: { id: true, name: true } }, followUps: { select: { id: true } } },
  });
  if (!c) throw new Error("Case not found");
  await requireLocationAccess(c.locationId);
  return c;
}

async function sendFollowUp(caseRow: { id: string; customerEmail: string | null; customerPhone: string | null; organizationId: string; locationId: string; location: { name: string } }) {
  const token = `rfu_${randomUUID().replace(/-/g, "")}`;
  await prisma.resolutionFollowUp.create({ data: { caseId: caseRow.id, token, sentAt: new Date() } });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = `${appUrl}/resolve-followup/${token}`;
  const message = `Following up from ${caseRow.location.name}: has your concern been addressed? Let us know: ${url}`;

  const apiKey = process.env.RESEND_API_KEY ?? "";
  if (apiKey && caseRow.customerEmail) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to: caseRow.customerEmail,
        subject: `Following up on your feedback — ${caseRow.location.name}`,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.6"><p>Has your concern been addressed?</p><p><a href="${url}">Share an update →</a></p></div>`,
      });
    } catch (err) {
      console.error("Follow-up email failed:", err);
    }
  }
  if (isSMSSendingConfigured() && caseRow.customerPhone) {
    try {
      await sendSMS({ to: caseRow.customerPhone, body: message });
    } catch (err) {
      console.error("Follow-up SMS failed:", err);
    }
  }
  await recordEvents({
    locationId: caseRow.locationId, organizationId: caseRow.organizationId,
    eventTypes: [ReviewLinkEventType.RESOLUTION_FOLLOWUP_SENT],
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null }, clientIp: null,
  }).catch(() => {});
}

export async function updateCaseStatus(formData: FormData): Promise<void> {
  const caseId = String(formData.get("caseId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ResolutionStatus;
  if (!caseId || !VALID_STATUSES.includes(status)) throw new Error("Invalid request");

  const c = await loadCase(caseId);
  const membership = await getCurrentMembership();

  const now = new Date();
  await prisma.resolutionCase.update({
    where: { id: caseId },
    data: {
      status,
      resolvedAt: status === ResolutionStatus.RESOLVED ? now : c.resolvedAt,
      closedAt: status === ResolutionStatus.CLOSED ? now : c.closedAt,
      notes: { create: { kind: "STATUS_CHANGE", membershipId: membership?.id ?? null, body: `Status changed to ${status}.` } },
    },
  });

  if (status === ResolutionStatus.RESOLVED) {
    const settings = await prisma.resolutionAssistantSettings.findUnique({ where: { locationId: c.locationId }, select: { followUpEnabled: true } });
    const hasContact = Boolean(c.customerEmail || c.customerPhone) && c.contactPreference !== "NONE";
    if (settings?.followUpEnabled && hasContact && c.followUps.length === 0) {
      await sendFollowUp({ id: c.id, customerEmail: c.customerEmail, customerPhone: c.customerPhone, organizationId: c.organizationId, locationId: c.locationId, location: c.location });
    }
    await recordEvents({
      locationId: c.locationId, organizationId: c.organizationId,
      eventTypes: [ReviewLinkEventType.RESOLUTION_CASE_RESOLVED],
      attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null }, clientIp: null,
    }).catch(() => {});
  }

  revalidatePath(`/customer-resolution/${caseId}`);
  redirect(`/customer-resolution/${caseId}?flash=Case+updated&tone=success`);
}

export async function addCaseNote(formData: FormData): Promise<void> {
  const caseId = String(formData.get("caseId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!caseId || !body) throw new Error("Invalid request");
  await loadCase(caseId);
  const membership = await getCurrentMembership();
  await prisma.resolutionCaseNote.create({ data: { caseId, kind: "NOTE", membershipId: membership?.id ?? null, body } });
  revalidatePath(`/customer-resolution/${caseId}`);
  redirect(`/customer-resolution/${caseId}?flash=Note+added&tone=success`);
}

export async function generateCaseResponseDraft(caseId: string): Promise<{ success: boolean; draft?: string; error?: string }> {
  if (!caseId) return { success: false, error: "Case ID is required" };
  let c;
  try {
    c = await loadCase(caseId);
  } catch {
    return { success: false, error: "Access denied" };
  }
  if (!process.env.GEMINI_API_KEY) return { success: false, error: "AI is not configured" };

  const settings = await prisma.resolutionAssistantSettings.findUnique({ where: { locationId: c.locationId }, select: { allowAiResponseDrafts: true } });
  if (!settings?.allowAiResponseDrafts) return { success: false, error: "AI response drafts are disabled for this location" };

  try {
    const draft = await draftCaseResponse({
      businessName: c.location.name,
      customerName: c.customerName,
      issueCategories: c.issueCategories,
      feedback: c.finalFeedback,
      requestedOutcome: c.requestedOutcome,
    });
    const membership = await getCurrentMembership();
    await prisma.resolutionCaseNote.create({ data: { caseId, kind: "AI_RESPONSE_DRAFT", membershipId: membership?.id ?? null, body: draft } });
    await recordEvents({
      locationId: c.locationId, organizationId: c.organizationId,
      eventTypes: [ReviewLinkEventType.RESOLUTION_RESPONSE_DRAFTED],
      attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null }, clientIp: null,
    }).catch(() => {});
    revalidatePath(`/customer-resolution/${caseId}`);
    return { success: true, draft };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Draft failed" };
  }
}
