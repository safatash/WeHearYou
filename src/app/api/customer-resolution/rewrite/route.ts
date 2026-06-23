import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/review-link-analytics";
import { isResolutionRateLimited } from "@/lib/resolution-analytics";
import { rewriteFeedbackForClarity } from "@/lib/customer-resolution";

const asString = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const locationId = asString(body.locationId);
  const feedback = asString(body.feedback);
  if (!locationId || !feedback) {
    return NextResponse.json({ error: "locationId and feedback are required" }, { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, organizationId: true, resolutionSettings: { select: { enabled: true, allowAiRewrite: true } } },
  });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  if (!location.resolutionSettings?.enabled || !location.resolutionSettings?.allowAiRewrite) {
    return NextResponse.json({ error: "Feedback assistant is not enabled for this location" }, { status: 403 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (await isResolutionRateLimited(locationId, clientIp)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 500 });
  }

  let rewritten: string;
  try {
    rewritten = await rewriteFeedbackForClarity(feedback, { issueCategories: asStringArray(body.issueCategories) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Rewrite failed" }, { status: 500 });
  }

  await recordEvents({
    locationId,
    organizationId: location.organizationId,
    eventTypes: [ReviewLinkEventType.RESOLUTION_AI_REWRITE_GENERATED],
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null },
    clientIp,
  }).catch(() => {});

  return NextResponse.json({ rewritten });
}
