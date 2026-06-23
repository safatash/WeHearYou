import { Prisma, ResolutionStatus, ResolutionPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getResolutionCases(
  locationIds: string[] | undefined,
  filters?: { status?: ResolutionStatus; priority?: ResolutionPriority },
) {
  const where: Prisma.ResolutionCaseWhereInput = {
    ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
  };
  return prisma.resolutionCase.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      customerName: true,
      rating: true,
      priority: true,
      status: true,
      issueCategories: true,
      contactPreference: true,
      createdAt: true,
      location: { select: { id: true, name: true } },
    },
  });
}

export async function getResolutionCaseById(id: string, locationIds?: string[]) {
  return prisma.resolutionCase.findFirst({
    where: {
      id,
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, user: { select: { name: true, email: true } } } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { membership: { select: { user: { select: { name: true } } } } },
      },
      followUps: { orderBy: { createdAt: "desc" } },
    },
  });
}
