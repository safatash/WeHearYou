import { CampaignStatus, PreferredChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const campaignInclude = {
  location: true,
  recipients: {
    include: {
      contact: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.CampaignInclude;

export type CampaignWithRelations = Prisma.CampaignGetPayload<{
  include: typeof campaignInclude;
}>;

export async function getCampaigns(locationIds?: string[]) {
  return prisma.campaign.findMany({
    where: locationIds ? { locationId: { in: locationIds } } : undefined,
    include: campaignInclude,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getCampaignById(id: string, locationIds?: string[]) {
  return prisma.campaign.findFirst({
    where: {
      id,
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: campaignInclude,
  });
}

export function formatCampaignStatus(status: CampaignStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatChannel(channel: PreferredChannel) {
  return channel === "SMS" ? "SMS" : "Email";
}

export function formatDateTime(date: Date | null) {
  if (!date) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
