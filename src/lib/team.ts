import { MembershipRole, MembershipStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const membershipInclude = {
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
} satisfies Prisma.UserMembershipInclude;

export type TeamMemberWithRelations = Prisma.UserMembershipGetPayload<{
  include: typeof membershipInclude;
}>;

const ORG_ADMIN_ROLES: MembershipRole[] = ["OWNER", "ADMIN"];
const LOCATION_SCOPED_ROLES: MembershipRole[] = ["MANAGER", "SUPPORT"];

export async function getTeamMembers() {
  return prisma.userMembership.findMany({
    include: membershipInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function getTeamMemberById(id: string) {
  return prisma.userMembership.findUnique({
    where: { id },
    include: membershipInclude,
  });
}

export function formatMembershipRole(role: MembershipRole) {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Agency Admin";
    case "MANAGER":
      return "Location Manager";
    case "ANALYST":
      return "Analyst";
    case "SUPPORT":
      return "Support";
    default:
      return role;
  }
}

export function formatMembershipStatus(status: MembershipStatus) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INVITED":
      return "Invited";
    case "DISABLED":
      return "Disabled";
    default:
      return status;
  }
}

export function getAssignedLocations(member: TeamMemberWithRelations) {
  if (ORG_ADMIN_ROLES.includes(member.role)) {
    return member.organization.locations;
  }

  if (member.role === "ANALYST" && member.locationAccess.length === 0) {
    return member.organization.locations;
  }

  return member.locationAccess.map((entry) => entry.location);
}

export function formatAccessSummary(member: TeamMemberWithRelations) {
  if (ORG_ADMIN_ROLES.includes(member.role)) {
    return "All locations";
  }

  const assignedLocations = getAssignedLocations(member);

  if (member.role === "ANALYST" && member.locationAccess.length === 0) {
    return "Reporting across all locations";
  }

  if (assignedLocations.length === 0) {
    return LOCATION_SCOPED_ROLES.includes(member.role) ? "No locations assigned" : "Custom scope not set";
  }

  if (assignedLocations.length === 1) {
    return `${assignedLocations[0].name} only`;
  }

  return `${assignedLocations.length} assigned locations`;
}

export function getMembershipStats(members: TeamMemberWithRelations[]) {
  const activeUsers = members.filter((member) => member.status === "ACTIVE").length;
  const invitedUsers = members.filter((member) => member.status === "INVITED").length;
  const roleTypes = new Set(members.map((member) => member.role)).size;
  const scopedLocations = new Set(
    members.flatMap((member) => getAssignedLocations(member).map((location) => location.id)),
  ).size;

  return {
    activeUsers,
    invitedUsers,
    roleTypes,
    scopedLocations,
  };
}

export function getPermissionList(member: TeamMemberWithRelations) {
  switch (member.role) {
    case "OWNER":
      return ["Manage billing", "Edit automations", "Invite team", "View all reviews", "Manage organization settings", "Manage integrations"];
    case "ADMIN":
      return ["Edit automations", "Invite team", "View all reviews", "Manage organization settings", "Manage integrations"];
    case "MANAGER":
      return member.status === "INVITED"
        ? ["View launch checklist", "Send requests", "Manage contacts"]
        : ["Reply to reviews", "Send requests", "View location reports", "Manage contacts"];
    case "ANALYST":
      return ["View dashboards", "Export reports", "Monitor review trends"];
    case "SUPPORT":
      return ["Manage contacts", "Reply to reviews", "View location reports"];
    default:
      return [];
  }
}

export function canManageTeam(member: TeamMemberWithRelations) {
  return ORG_ADMIN_ROLES.includes(member.role);
}

export function canManageAutomations(member: TeamMemberWithRelations) {
  return ORG_ADMIN_ROLES.includes(member.role);
}

export function canManageBilling(member: TeamMemberWithRelations) {
  return member.role === "OWNER";
}

export function canViewLocation(member: TeamMemberWithRelations, locationId: string) {
  return getAssignedLocations(member).some((location) => location.id === locationId);
}

export function canReplyToReviews(member: TeamMemberWithRelations, locationId: string) {
  if (!["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(member.role)) {
    return false;
  }

  return canViewLocation(member, locationId);
}

export function canManageContacts(member: TeamMemberWithRelations, locationId: string) {
  if (!["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(member.role)) {
    return false;
  }

  return canViewLocation(member, locationId);
}

export function canViewAnalytics(member: TeamMemberWithRelations, locationId: string) {
  if (!["OWNER", "ADMIN", "MANAGER", "ANALYST", "SUPPORT"].includes(member.role)) {
    return false;
  }

  return canViewLocation(member, locationId);
}
