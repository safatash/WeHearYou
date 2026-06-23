import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/review-link-analytics";
import { isAssistantRateLimited } from "@/lib/review-assistant-analytics";
import { generateAssistedReview, normalizeTone, normalizeLength, type AssistantContext } from "@/lib/review-assistant";

function clientIpFrom(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

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
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "A valid rating is required" }, { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { publicProfile: true },
  });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const profile = location.publicProfile;
  if (!profile?.aiAssistantEnabled || !profile?.aiAssistantAllowGeneration) {
    return NextResponse.json({ error: "AI Review Assistant is not enabled for this location" }, { status: 403 });
  }

  const threshold = profile.negativeFilterThreshold ?? 4;
  if (rating < threshold) {
    return NextResponse.json({ error: "The assistant is only available for positive ratings" }, { status: 400 });
  }

  const clientIp = clientIpFrom(req);
  if (await isAssistantRateLimited(locationId, clientIp)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 500 });
  }

  const tone = normalizeTone(asString(body.tone));
  const length = normalizeLength(asString(body.length));
  const selectedPhrases = asStringArray(body.selectedPhrases);
  const service = profile.aiAssistantIncludeService ? asString(body.service) : null;
  const staffMember = asString(body.staffMember);
  const notes = profile.aiAssistantAllowNotes ? asString(body.notes) : null;
  const isRegenerate = body.isRegenerate === true;
  const sessionId = asString(body.sessionId);

  const ctx: AssistantContext = {
    businessName: location.name,
    locationName: location.name,
    city: location.city,
    state: location.state,
    businessCategory: profile.businessType,
    service,
    staffMember,
    selectedPhrases,
    customerNotes: notes,
    topReviewThemes: profile.aiAssistantUseReviewThemes ? profile.reviewHighlights : [],
    tone,
    length,
    includeBusiness: profile.aiAssistantIncludeBusiness,
    includeCity: profile.aiAssistantIncludeCity,
    includeService: profile.aiAssistantIncludeService,
  };

  let review: string;
  try {
    const result = await generateAssistedReview(ctx);
    review = result.review;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Persist / update the session
  let savedSessionId = sessionId;
  try {
    if (sessionId) {
      await prisma.reviewAssistantSession.updateMany({
        where: { id: sessionId, locationId },
        data: { generatedReview: review, tone, length, service, staffMember, notes, selectedPhrases },
      });
    } else {
      const created = await prisma.reviewAssistantSession.create({
        data: {
          organizationId: location.organizationId,
          locationId,
          rating: Math.round(rating),
          selectedPhrases,
          service,
          staffMember,
          notes,
          generatedReview: review,
          tone,
          length,
        },
        select: { id: true },
      });
      savedSessionId = created.id;
    }
  } catch {
    // session persistence is best-effort; never block the customer
  }

  await recordEvents({
    locationId,
    organizationId: location.organizationId,
    eventTypes: [isRegenerate ? ReviewLinkEventType.AI_ASSIST_REGENERATED : ReviewLinkEventType.AI_ASSIST_GENERATED],
    attribution: { source: null, medium: null, placement: null, sessionId: null, referrer: null },
    clientIp,
  }).catch(() => {});

  return NextResponse.json({ review, sessionId: savedSessionId });
}
