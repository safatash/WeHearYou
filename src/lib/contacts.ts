import { ContactSource, ContactStatus, PreferredChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const contactInclude = {
  location: true,
  tags: {
    include: {
      tag: true,
    },
  },
  campaigns: {
    include: {
      campaign: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
} satisfies Prisma.ContactInclude;

export type ContactWithRelations = Prisma.ContactGetPayload<{
  include: typeof contactInclude;
}>;

export async function getContacts(locationIds?: string[]) {
  return prisma.contact.findMany({
    where: locationIds ? { locationId: { in: locationIds } } : undefined,
    include: contactInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function getContactById(id: string, locationIds?: string[]) {
  return prisma.contact.findFirst({
    where: {
      id,
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: contactInclude,
  });
}

export function formatContactSource(source: ContactSource) {
  switch (source) {
    case "CSV_IMPORT":
      return "CSV Import";
    case "WEBHOOK":
      return "Webhook";
    case "API":
      return "API";
    case "MANUAL":
    default:
      return "Manual";
  }
}

export function formatContactStatus(status: ContactStatus) {
  switch (status) {
    case "NEEDS_FOLLOW_UP":
      return "Needs follow-up";
    case "ARCHIVED":
      return "Archived";
    case "ACTIVE":
    default:
      return "Active";
  }
}

export function formatPreferredChannel(channel: PreferredChannel) {
  return channel === "SMS" ? "SMS" : "Email";
}

export function formatLastInvite(date: Date | null) {
  if (!date) {
    return "Not sent yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
