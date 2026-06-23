import { NextRequest } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents, isMiniSiteRateLimited } from "@/lib/review-link-analytics";

/** Client-fireable resolution flow events (submit/create happen server-side). */
const ALLOWED: Record<string, ReviewLinkEventType> = {
  RESOLUTION_VIEWED: ReviewLinkEventType.RESOLUTION_VIEWED,
  RESOLUTION_ISSUE_SELECTED: ReviewLinkEventType.RESOLUTION_ISSUE_SELECTED,
  RESOLUTION_FEEDBACK_STARTED: ReviewLinkEventType.RESOLUTION_FEEDBACK_STARTED,
  RESOLUTION_AI_REWRITE_ACCEPTED: ReviewLinkEventType.RESOLUTION_AI_REWRITE_ACCEPTED,
  RESOLUTION_CONTACT_REQUESTED: ReviewLinkEventType.RESOLUTION_CONTACT_REQUESTED,
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.locationId !== "string" || typeof body.event !== "string") {
    return new Response("Bad request", { status: 400 });
  }
  const eventType = ALLOWED[body.event];
  if (!eventType) {
    return new Response("Unknown event", { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { id: body.locationId },
    select: { id: true, organizationId: true },
  });
  if (!location) {
    return new Response("Not found", { status: 404 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (await isMiniSiteRateLimited(location.id, clientIp)) {
    return new Response(null, { status: 204 });
  }

  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [eventType],
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null },
    clientIp,
  }).catch(() => {});

  return new Response(null, { status: 204 });
}
