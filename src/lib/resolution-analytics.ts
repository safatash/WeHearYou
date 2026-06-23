/**
 * Aggregation for the Customer Resolution dashboard widgets. The summarize
 * step is pure for unit testing.
 */
import { ReviewLinkEventType, ResolutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ResolutionStats = {
  newCases: number;
  highPriority: number;
  resolved: number;
  total: number;
  resolutionRate: number; // 0..1
  averageRating: number; // 0..5
  contactRequested: number;
};

export function summarizeResolutionCases(
  cases: { status: string; priority: string; rating: number; contactPreference: string }[],
): ResolutionStats {
  const total = cases.length;
  const newCases = cases.filter((c) => c.status === "NEW" || c.status === "NEEDS_RESPONSE").length;
  const highPriority = cases.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length;
  const resolved = cases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const contactRequested = cases.filter((c) => c.contactPreference !== "NONE").length;
  const ratingSum = cases.reduce((s, c) => s + (c.rating || 0), 0);

  return {
    newCases,
    highPriority,
    resolved,
    total,
    resolutionRate: total > 0 ? resolved / total : 0,
    averageRating: total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0,
    contactRequested,
  };
}

export async function getResolutionStats(locationIds: string[] | undefined, days: number): Promise<ResolutionStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cases = await prisma.resolutionCase.findMany({
    where: {
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
      createdAt: { gte: since },
    },
    select: { status: true, priority: true, rating: true, contactPreference: true },
  });
  return summarizeResolutionCases(cases);
}

/** Rate-limit AI rewrites: max 15 per location per IP per hour. */
export async function isResolutionRateLimited(locationId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.reviewLinkEvent.count({
    where: {
      locationId,
      clientIp,
      eventType: ReviewLinkEventType.RESOLUTION_AI_REWRITE_GENERATED,
      createdAt: { gte: oneHourAgo },
    },
  });
  return count >= 15;
}

export const OPEN_CASE_STATUSES: ResolutionStatus[] = [
  ResolutionStatus.NEW,
  ResolutionStatus.NEEDS_RESPONSE,
  ResolutionStatus.CONTACTED,
  ResolutionStatus.IN_PROGRESS,
];
