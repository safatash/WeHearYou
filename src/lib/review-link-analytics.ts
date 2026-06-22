import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALID_SOURCES = new Set(["email_signature", "qr_counter", "invoice", "website"]);
const VALID_MEDIUMS = new Set(["email", "print", "digital"]);
const VALID_PLACEMENTS = new Set(["happy_button", "unhappy_button", "happy_card", "unhappy_card"]);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Attribution = {
  source: string | null;
  medium: string | null;
  placement: string | null;
  sessionId: string | null;
  referrer: string | null;
};

export function sanitizeAttribution(raw: {
  src?: string | null;
  medium?: string | null;
  placement?: string | null;
  sessionId?: string | null;
  referrer?: string | null;
}): Attribution {
  let referrer: string | null = null;
  if (raw.referrer) {
    try {
      const u = new URL(raw.referrer);
      referrer = `${u.origin}${u.pathname}`.slice(0, 500);
    } catch {
      referrer = null;
    }
  }
  return {
    source: VALID_SOURCES.has(raw.src ?? "") ? (raw.src as string) : null,
    medium: VALID_MEDIUMS.has(raw.medium ?? "") ? (raw.medium as string) : null,
    placement: VALID_PLACEMENTS.has(raw.placement ?? "") ? (raw.placement as string) : null,
    sessionId: UUID_V4_RE.test(raw.sessionId ?? "") ? (raw.sessionId as string) : null,
    referrer,
  };
}

export async function recordEvents(params: {
  locationId: string;
  organizationId: string;
  eventTypes: ReviewLinkEventType[];
  attribution: Attribution;
  clientIp?: string | null;
}): Promise<void> {
  await prisma.reviewLinkEvent.createMany({
    data: params.eventTypes.map((eventType) => ({
      locationId: params.locationId,
      organizationId: params.organizationId,
      eventType,
      source: params.attribution.source,
      medium: params.attribution.medium,
      placement: params.attribution.placement,
      sessionId: params.attribution.sessionId,
      referrer: params.attribution.referrer,
      clientIp: params.clientIp ?? null,
    })),
  });
}

export async function isRateLimited(locationId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.reviewLinkEvent.count({
    where: {
      locationId,
      eventType: ReviewLinkEventType.FEEDBACK_SUBMITTED,
      clientIp,
      createdAt: { gte: oneHourAgo },
    },
  });
  return count >= 5;
}

export async function isMiniSiteRateLimited(locationId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) return false;
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const count = await prisma.reviewLinkEvent.count({
    where: {
      locationId,
      clientIp,
      eventType: { in: MINISITE_EVENT_TYPES as unknown as ReviewLinkEventType[] },
      createdAt: { gte: oneMinuteAgo },
    },
  });
  return count >= 60;
}

export async function getLocationAnalytics(locationId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byEventType, bySource, uniqueSessionRows] = await Promise.all([
    prisma.reviewLinkEvent.groupBy({
      by: ["eventType"],
      where: { locationId, createdAt: { gte: since } },
      _count: { eventType: true },
    }),
    prisma.reviewLinkEvent.groupBy({
      by: ["source", "eventType"],
      where: { locationId, createdAt: { gte: since } },
      _count: true,
    }),
    prisma.reviewLinkEvent.findMany({
      where: {
        locationId,
        eventType: ReviewLinkEventType.LINK_VIEWED,
        sessionId: { not: null },
        createdAt: { gte: since },
      },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
  ]);

  const counts = Object.fromEntries(
    byEventType.map((row) => [row.eventType, row._count.eventType]),
  ) as Partial<Record<ReviewLinkEventType, number>>;

  return {
    uniqueViews: uniqueSessionRows.length,
    happyClicks: counts[ReviewLinkEventType.HAPPY_CLICKED] ?? 0,
    unhappyClicks: counts[ReviewLinkEventType.UNHAPPY_CLICKED] ?? 0,
    googleRedirects: counts[ReviewLinkEventType.GOOGLE_REDIRECT_CLICKED] ?? 0,
    feedbackStarts: counts[ReviewLinkEventType.FEEDBACK_STARTED] ?? 0,
    feedbackSubmissions: counts[ReviewLinkEventType.FEEDBACK_SUBMITTED] ?? 0,
    bySource,
  };
}

export type MiniSiteEventType =
  | "MINISITE_VIEWED"
  | "MINISITE_CLICK_REVIEW"
  | "MINISITE_CLICK_CALL"
  | "MINISITE_CLICK_WEBSITE"
  | "MINISITE_CLICK_DIRECTIONS"
  | "MINISITE_CLICK_CTA";

export const MINISITE_EVENT_TYPES: readonly MiniSiteEventType[] = [
  "MINISITE_VIEWED",
  "MINISITE_CLICK_REVIEW",
  "MINISITE_CLICK_CALL",
  "MINISITE_CLICK_WEBSITE",
  "MINISITE_CLICK_DIRECTIONS",
  "MINISITE_CLICK_CTA",
];

export function isMiniSiteEventType(v: string): v is MiniSiteEventType {
  return (MINISITE_EVENT_TYPES as readonly string[]).includes(v);
}

export type MiniSiteAnalytics = {
  pageViews: number;
  reviewClicks: number;
  callClicks: number;
  websiteClicks: number;
  directionsClicks: number;
  ctaClicks: number;
  hasData: boolean;
};

export function summarizeMiniSiteEvents(
  rows: Array<{ eventType: string; count: number }>,
): MiniSiteAnalytics {
  const get = (type: MiniSiteEventType) =>
    rows.find((r) => r.eventType === type)?.count ?? 0;
  const summary = {
    pageViews: get("MINISITE_VIEWED"),
    reviewClicks: get("MINISITE_CLICK_REVIEW"),
    callClicks: get("MINISITE_CLICK_CALL"),
    websiteClicks: get("MINISITE_CLICK_WEBSITE"),
    directionsClicks: get("MINISITE_CLICK_DIRECTIONS"),
    ctaClicks: get("MINISITE_CLICK_CTA"),
  };
  const hasData = Object.values(summary).some((n) => n > 0);
  return { ...summary, hasData };
}

export async function getMiniSiteAnalytics(
  locationId: string,
  days: number,
): Promise<MiniSiteAnalytics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.reviewLinkEvent.groupBy({
    by: ["eventType"],
    where: {
      locationId,
      createdAt: { gte: since },
      eventType: { in: MINISITE_EVENT_TYPES as unknown as ReviewLinkEventType[] },
    },
    _count: { eventType: true },
  });
  return summarizeMiniSiteEvents(
    grouped.map((row) => ({ eventType: row.eventType as string, count: row._count.eventType })),
  );
}
