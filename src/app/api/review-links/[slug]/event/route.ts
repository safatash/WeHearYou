import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAttribution, recordEvents } from "@/lib/review-link-analytics";

const ALLOWED_EVENTS = new Set<string>(["LINK_VIEWED", "FEEDBACK_STARTED"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const event = typeof body.event === "string" ? body.event : null;
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const location = await prisma.location.findFirst({
      where: { slug },
      select: { id: true, organizationId: true },
    });

    if (!location) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const attr = sanitizeAttribution({
      src: body.src,
      medium: body.medium,
      placement: body.placement,
      sessionId: body.sessionId,
      referrer: request.headers.get("referer"),
    });

    await recordEvents({
      locationId: location.id,
      organizationId: location.organizationId,
      eventTypes: [event as ReviewLinkEventType],
      attribution: attr,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
