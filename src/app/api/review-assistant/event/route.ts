import { NextRequest } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents, isMiniSiteRateLimited } from "@/lib/review-link-analytics";

/** Client-fireable AI assistant events (the generate route handles GENERATED/REGENERATED). */
const ALLOWED: Record<string, ReviewLinkEventType> = {
  AI_ASSIST_VIEWED: ReviewLinkEventType.AI_ASSIST_VIEWED,
  AI_ASSIST_EDITED: ReviewLinkEventType.AI_ASSIST_EDITED,
  AI_ASSIST_COPIED: ReviewLinkEventType.AI_ASSIST_COPIED,
  AI_ASSIST_DEST_GOOGLE: ReviewLinkEventType.AI_ASSIST_DEST_GOOGLE,
  AI_ASSIST_DEST_YELP: ReviewLinkEventType.AI_ASSIST_DEST_YELP,
  AI_ASSIST_DEST_FACEBOOK: ReviewLinkEventType.AI_ASSIST_DEST_FACEBOOK,
  AI_ASSIST_DEST_TRUSTPILOT: ReviewLinkEventType.AI_ASSIST_DEST_TRUSTPILOT,
  AI_ASSIST_WEHEARYOU_SUBMITTED: ReviewLinkEventType.AI_ASSIST_WEHEARYOU_SUBMITTED,
  START_FROM_SCRATCH_SELECTED: ReviewLinkEventType.START_FROM_SCRATCH_SELECTED,
  MANUAL_WRITING_STARTED: ReviewLinkEventType.MANUAL_WRITING_STARTED,
  MANUAL_REVIEW_COMPLETED: ReviewLinkEventType.MANUAL_REVIEW_COMPLETED,
  AI_DRAFT_ACCEPTED: ReviewLinkEventType.AI_DRAFT_ACCEPTED,
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

  // Reflect copy / destination interactions on the session record (best-effort)
  if (typeof body.sessionId === "string" && body.sessionId) {
    const data: { reviewCopied?: boolean; destinationClicked?: boolean; destination?: string } = {};
    if (body.event === "AI_ASSIST_COPIED") data.reviewCopied = true;
    if (body.event.startsWith("AI_ASSIST_DEST_")) {
      data.destinationClicked = true;
      data.destination = body.event.replace("AI_ASSIST_DEST_", "");
    }
    if (Object.keys(data).length > 0) {
      await prisma.reviewAssistantSession.updateMany({ where: { id: body.sessionId, locationId: location.id }, data }).catch(() => {});
    }
  }

  return new Response(null, { status: 204 });
}
