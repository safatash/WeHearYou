"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement, getCurrentMembership } from "@/lib/authz";

const ROLE_OPTIONS: MembershipRole[] = ["ADMIN", "MANAGER", "ANALYST", "SUPPORT"];

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function getInviteAccessScope(role: MembershipRole, locationNames: string[]) {
  if (["OWNER", "ADMIN"].includes(role)) {
    return "All locations";
  }

  if (role === "ANALYST" && locationNames.length === 0) {
    return "Reporting across all locations";
  }

  if (locationNames.length === 0) {
    return null;
  }

  if (locationNames.length === 1) {
    return `${locationNames[0]} only`;
  }

  return `${locationNames.length} assigned locations`;
}

export type InviteTeamMemberState = {
  error?: string;
};

export type AcceptInviteState = {
  error?: string;
};

export async function inviteTeamMember(_prevState: InviteTeamMemberState, formData: FormData): Promise<InviteTeamMemberState> {
  const currentMembership = await requireTeamManagement();
  const email = normalize(formData.get("email"))?.toLowerCase();
  const name = normalize(formData.get("name"));
  const roleValue = normalize(formData.get("role"));
  const locationIds = formData.getAll("locationIds").map((value) => String(value));

  if (!email || !name || !roleValue) {
    return { error: "Name, email, and role are required." };
  }

  if (!ROLE_OPTIONS.includes(roleValue as MembershipRole)) {
    return { error: "Invalid role selected." };
  }

  const role = roleValue as MembershipRole;
  const organization = await prisma.organization.findUnique({
    where: { id: currentMembership.organizationId },
    include: {
      locations: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!organization) {
    return { error: "Organization not found." };
  }

  const allowedLocationIds = new Set(organization.locations.map((location) => location.id));
  const normalizedLocationIds = Array.from(new Set(locationIds.filter((id) => allowedLocationIds.has(id))));
  const assignedLocations = organization.locations.filter((location) => normalizedLocationIds.includes(location.id));

  if (["MANAGER", "SUPPORT"].includes(role) && assignedLocations.length === 0) {
    return { error: "Managers and support users need at least one assigned location." };
  }

  const inviteToken = crypto.randomBytes(24).toString("hex");
  const accessScope = getInviteAccessScope(role, assignedLocations.map((location) => location.name));

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
    },
    create: {
      name,
      email,
    },
  });

  const membership = await prisma.userMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role,
      status: MembershipStatus.INVITED,
      accessScope,
      inviteToken,
      inviteSentAt: new Date(),
      invitedByUserId: currentMembership.userId,
      locationAccess: {
        deleteMany: {},
        create: normalizedLocationIds.map((locationId) => ({ locationId })),
      },
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role,
      status: MembershipStatus.INVITED,
      accessScope,
      inviteToken,
      inviteSentAt: new Date(),
      invitedByUserId: currentMembership.userId,
      locationAccess: normalizedLocationIds.length
        ? {
            create: normalizedLocationIds.map((locationId) => ({ locationId })),
          }
        : undefined,
    },
  });

  revalidatePath("/team");
  redirect(`/team?flash=${encodeURIComponent(`Invite created for ${email}`)}&tone=success&invite=${membership.inviteToken}`);
}

export async function acceptInvite(_prevState: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const inviteToken = normalize(formData.get("inviteToken"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!inviteToken) {
    return { error: "Invite token is required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const membership = await prisma.userMembership.findFirst({
    where: {
      inviteToken,
      status: MembershipStatus.INVITED,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return { error: "Invite not found or already used." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      passwordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.userMembership.update({
    where: { id: membership.id },
    data: {
      status: MembershipStatus.ACTIVE,
      inviteToken: null,
    },
  });

  redirect("/login?flash=Invite+accepted.+You+can+sign+in+now.&tone=success");
}

export async function resetInvite(membershipId: string) {
  const currentMembership = await requireTeamManagement();
  const inviteToken = crypto.randomBytes(24).toString("hex");

  const membership = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, organizationId: true, user: { select: { email: true } } },
  });

  if (!membership || membership.organizationId !== currentMembership.organizationId) {
    throw new Error("Membership not found.");
  }

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: {
      status: MembershipStatus.INVITED,
      inviteToken,
      inviteSentAt: new Date(),
      invitedByUserId: currentMembership.userId,
    },
  });

  revalidatePath("/team");
  redirect(`/team/${membershipId}?flash=${encodeURIComponent(`Invite reset for ${membership.user.email}`)}&tone=success`);
}

export async function getInvitePreviewToken() {
  const membership = await getCurrentMembership();
  return membership?.id ?? null;
}
