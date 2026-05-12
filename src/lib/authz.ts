import { MembershipStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageAutomations,
  canManageBilling,
  canManageContacts,
  canManageTeam,
  canReplyToReviews,
  canViewAnalytics,
  canViewLocation,
  type TeamMemberWithRelations,
} from "@/lib/team";

export async function getCurrentMembership() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return prisma.userMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      user: true,
      organization: {
        include: {
          locations: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      locationAccess: {
        include: {
          location: true,
        },
        orderBy: {
          location: {
            createdAt: "asc",
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function requireMembership() {
  const membership = await getCurrentMembership();

  if (!membership) {
    throw new Error("No active membership found");
  }

  return membership as TeamMemberWithRelations;
}

export async function requireLocationAccess(locationId: string) {
  const membership = await requireMembership();

  if (!canViewLocation(membership, locationId)) {
    throw new Error("You do not have access to this location");
  }

  return membership;
}

export async function requireContactManagement(locationId: string) {
  const membership = await requireMembership();

  if (!canManageContacts(membership, locationId)) {
    throw new Error("You do not have permission to manage contacts for this location");
  }

  return membership;
}

export async function requireReviewReplyAccess(locationId: string) {
  const membership = await requireMembership();

  if (!canReplyToReviews(membership, locationId)) {
    throw new Error("You do not have permission to manage reviews for this location");
  }

  return membership;
}

export async function requireAnalyticsAccess(locationId: string) {
  const membership = await requireMembership();

  if (!canViewAnalytics(membership, locationId)) {
    throw new Error("You do not have permission to view analytics for this location");
  }

  return membership;
}

export async function requireAutomationManagement() {
  const membership = await requireMembership();

  if (!canManageAutomations(membership)) {
    throw new Error("You do not have permission to manage automations");
  }

  return membership;
}

export async function requireTeamManagement() {
  const membership = await requireMembership();

  if (!canManageTeam(membership)) {
    throw new Error("You do not have permission to manage team access");
  }

  return membership;
}

export async function requireBillingManagement() {
  const membership = await requireMembership();

  if (!canManageBilling(membership)) {
    throw new Error("You do not have permission to manage billing");
  }

  return membership;
}

export async function requireOrganizationAccess(organizationId: string) {
  const membership = await requireMembership();

  if (membership.organizationId !== organizationId) {
    throw new Error("You do not have access to this organization");
  }

  return membership;
}
