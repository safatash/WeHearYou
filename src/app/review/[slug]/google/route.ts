import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { sanitizeAttribution, recordEvents } from "@/lib/review-link-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: {
      id: true,
      organizationId: true,
      reviewLink: true,
      googlePlaceId: true,
    },
  });

  if (!location) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Resolve Google URL from trusted location record only — never from query params
  const googleUrl =
    location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId);

  if (!googleUrl) {
    const fallback = new URL(`/review/${slug}`, request.url);
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const url = new URL(request.url);
  const attr = sanitizeAttribution({
    src: url.searchParams.get("src"),
    medium: url.searchParams.get("medium"),
    placement: url.searchParams.get("placement"),
    sessionId: url.searchParams.get("sessionId"),
    referrer: request.headers.get("referer"),
  });

  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [
      ReviewLinkEventType.HAPPY_CLICKED,
      ReviewLinkEventType.GOOGLE_REDIRECT_CLICKED,
    ],
    attribution: attr,
    clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  return NextResponse.redirect(googleUrl, { status: 302 });
}
