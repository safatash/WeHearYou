import { NextRequest } from "next/server";
import { getPublicLocationBySlug } from "@/lib/public-profile";
import { isMiniSiteEventType, sanitizeAttribution, isRateLimited, recordEvents } from "@/lib/review-link-analytics";
import type { ReviewLinkEventType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.eventType !== "string" || !isMiniSiteEventType(body.eventType)) {
    return new Response("Bad request", { status: 400 });
  }
  const location = await getPublicLocationBySlug(slug);
  if (!location) return new Response("Not found", { status: 404 });

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (await isRateLimited(location.id, clientIp)) return new Response(null, { status: 204 });

  const attribution = sanitizeAttribution({
    sessionId: body.sessionId ?? null,
    referrer: req.headers.get("referer"),
  });
  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [body.eventType as ReviewLinkEventType],
    attribution,
    clientIp,
  });
  return new Response(null, { status: 204 });
}
