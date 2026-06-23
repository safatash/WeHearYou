/**
 * Aggregation for the AI Review Assistant dashboard widgets. Reuses the
 * ReviewLinkEvent store (AI_ASSIST_* event types) plus campaign send counts.
 * The summarize step is pure for unit testing.
 */
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ASSISTANT_EVENT_TYPES: ReviewLinkEventType[] = [
  ReviewLinkEventType.AI_ASSIST_VIEWED,
  ReviewLinkEventType.AI_ASSIST_GENERATED,
  ReviewLinkEventType.AI_ASSIST_REGENERATED,
  ReviewLinkEventType.AI_ASSIST_EDITED,
  ReviewLinkEventType.AI_ASSIST_COPIED,
  ReviewLinkEventType.AI_ASSIST_DEST_GOOGLE,
  ReviewLinkEventType.AI_ASSIST_DEST_YELP,
  ReviewLinkEventType.AI_ASSIST_DEST_FACEBOOK,
  ReviewLinkEventType.AI_ASSIST_DEST_TRUSTPILOT,
  ReviewLinkEventType.AI_ASSIST_WEHEARYOU_SUBMITTED,
];

export type AssistantAnalytics = {
  requestsSent: number;
  reviewsStarted: number;
  aiGenerated: number;
  reviewsCopied: number;
  googleClicks: number;
  destinationClicks: number;
  wehearyouSubmitted: number;
  privateFeedback: number;
  googleClickRate: number; // 0..1
  destinationClickRate: number; // 0..1
  completionRate: number; // 0..1
};

const rate = (num: number, den: number) => (den > 0 ? num / den : 0);

/** Pure: turn raw event counts + sent count into the dashboard metrics. */
export function summarizeAssistantEvents(input: {
  counts: Partial<Record<ReviewLinkEventType, number>>;
  requestsSent: number;
}): AssistantAnalytics {
  const c = input.counts;
  const get = (t: ReviewLinkEventType) => c[t] ?? 0;

  const reviewsStarted = get(ReviewLinkEventType.AI_ASSIST_VIEWED);
  const googleClicks = get(ReviewLinkEventType.AI_ASSIST_DEST_GOOGLE);
  const destinationClicks =
    googleClicks +
    get(ReviewLinkEventType.AI_ASSIST_DEST_YELP) +
    get(ReviewLinkEventType.AI_ASSIST_DEST_FACEBOOK) +
    get(ReviewLinkEventType.AI_ASSIST_DEST_TRUSTPILOT);
  const wehearyouSubmitted = get(ReviewLinkEventType.AI_ASSIST_WEHEARYOU_SUBMITTED);

  return {
    requestsSent: input.requestsSent,
    reviewsStarted,
    aiGenerated: get(ReviewLinkEventType.AI_ASSIST_GENERATED),
    reviewsCopied: get(ReviewLinkEventType.AI_ASSIST_COPIED),
    googleClicks,
    destinationClicks,
    wehearyouSubmitted,
    privateFeedback: get(ReviewLinkEventType.FEEDBACK_SUBMITTED),
    googleClickRate: rate(googleClicks, reviewsStarted),
    destinationClickRate: rate(destinationClicks, reviewsStarted),
    completionRate: rate(destinationClicks + wehearyouSubmitted, reviewsStarted),
  };
}

export async function getReviewAssistantAnalytics(
  locationIds: string[] | undefined,
  days: number,
): Promise<AssistantAnalytics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const locationFilter = locationIds && locationIds.length > 0 ? { in: locationIds } : undefined;

  const [grouped, requestsSent] = await Promise.all([
    prisma.reviewLinkEvent.groupBy({
      by: ["eventType"],
      where: {
        ...(locationFilter ? { locationId: locationFilter } : {}),
        createdAt: { gte: since },
        eventType: { in: [...ASSISTANT_EVENT_TYPES, ReviewLinkEventType.FEEDBACK_SUBMITTED] },
      },
      _count: { eventType: true },
    }),
    prisma.campaignRecipient.count({
      where: {
        sentAt: { gte: since },
        ...(locationFilter ? { campaign: { locationId: locationFilter } } : {}),
      },
    }),
  ]);

  const counts = Object.fromEntries(
    grouped.map((row) => [row.eventType, row._count.eventType]),
  ) as Partial<Record<ReviewLinkEventType, number>>;

  return summarizeAssistantEvents({ counts, requestsSent });
}

/** Rate-limit AI generations: max 20 per location per IP per hour. */
export async function isAssistantRateLimited(locationId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.reviewLinkEvent.count({
    where: {
      locationId,
      clientIp,
      eventType: { in: [ReviewLinkEventType.AI_ASSIST_GENERATED, ReviewLinkEventType.AI_ASSIST_REGENERATED] },
      createdAt: { gte: oneHourAgo },
    },
  });
  return count >= 20;
}
