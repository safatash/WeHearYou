import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership, requireReviewReplyAccess } from "@/lib/authz";
import { getReviewById } from "@/lib/reviews";
import { generateReplyDraft } from "@/lib/ai-reply";

export async function POST(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!membership.organization.aiReplyEnabled) {
    return NextResponse.json({ error: "Pro feature — upgrade to use AI replies" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI reply is not configured" }, { status: 500 });
  }

  let body: { reviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const reviewId = typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
  }

  const review = await getReviewById(reviewId);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  try {
    await requireReviewReplyAccess(review.locationId);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const draft = await generateReplyDraft({
      reviewerName: review.reviewerName,
      rating: review.rating ?? 0,
      body: review.body,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
