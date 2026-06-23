"use server";

import { redirect } from "next/navigation";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/review-link-analytics";

export async function submitFollowUpResponse(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim().toUpperCase();
  const detail = String(formData.get("detail") ?? "").trim() || null;

  if (!token || !["YES", "PARTIALLY", "NO"].includes(response)) {
    redirect(`/resolve-followup/${token}?error=invalid`);
  }

  const followUp = await prisma.resolutionFollowUp.findUnique({
    where: { token },
    include: { case: { select: { id: true, locationId: true, organizationId: true } } },
  });
  if (!followUp) {
    redirect(`/resolve-followup/${token}?error=missing`);
  }

  await prisma.resolutionFollowUp.update({
    where: { token },
    data: { response, responseDetail: detail, respondedAt: new Date() },
  });

  await prisma.resolutionCaseNote.create({
    data: {
      caseId: followUp.case.id,
      kind: "FOLLOW_UP",
      body: `Customer follow-up: ${response}${detail ? ` — ${detail}` : ""}`,
    },
  });

  await recordEvents({
    locationId: followUp.case.locationId,
    organizationId: followUp.case.organizationId,
    eventTypes: [ReviewLinkEventType.RESOLUTION_FOLLOWUP_COMPLETED],
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null },
    clientIp: null,
  }).catch(() => {});

  redirect(`/resolve-followup/${token}?done=1`);
}
