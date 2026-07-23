"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement, getCurrentMembership } from "@/lib/authz";
import { formatMembershipRole } from "@/lib/team";
import { isEmailSendingConfigured, sendTeamInviteEmail } from "@/lib/email";

const ROLE_OPTIONS: MembershipRole[] = ["ADMIN", "MANAGER", "ANALYST", "SUPPORT"];

// Roles that can be set by non-owners (ADMIN and below can invite up to ADMIN)
const ROLE_LEVEL: Record<MembershipRole, number> = {
  OWNER: 5, ADMIN: 4, MANAGER: 3, ANALYST: 2, SUPPORT: 1,
};

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function getInviteAccessScope(role: MembershipRole, locationNames: string[]) {
  if (["OWNER", "ADMIN"].includes(role)) return "All locations";
  if (role === "ANALYST" && locationNames.length === 0) return "Reporting across all locations";
  if (locationNames.length === 0) return null;
  if (locationNames.length === 1) return `${locationNames[0]} only`;
  return `${locationNames.length} assigned locations`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type InviteTeamMemberState = { error?: string; emailWarning?: string };
export type UpdateMemberRoleState = { error?: string };
export type AcceptInviteState  = { error?: string };

// ── Invite ────────────────────────────────────────────────────────────────────

export async function inviteTeamMember(
  _prevState: InviteTeamMemberState,
  formData: FormData,
): Promise<InviteTeamMemberState> {
  const currentMembership = await requireTeamManagement();
  const email       = normalize(formData.get("email"))?.toLowerCase();
  const name        = normalize(formData.get("name"));
  const roleValue   = normalize(formData.get("role"));
  const locationIds = formData.getAll("locationIds").map((v) => String(v));

  if (!email || !name || !roleValue) return { error: "Name, email, and role are required." };
  if (!ROLE_OPTIONS.includes(roleValue as MembershipRole)) return { error: "Invalid role selected." };

  const role = roleValue as MembershipRole;

  const organization = await prisma.organization.findUnique({
    where: { id: currentMembership.organizationId },
    include: {
      locations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!organization) return { error: "Organization not found." };

  const allowedLocationIds   = new Set(organization.locations.map((l) => l.id));
  const normalizedLocationIds = Array.from(new Set(locationIds.filter((id) => allowedLocationIds.has(id))));
  const assignedLocations    = organization.locations.filter((l) => normalizedLocationIds.includes(l.id));

  if (["MANAGER", "SUPPORT"].includes(role) && assignedLocations.length === 0) {
    return { error: "Managers and support users need at least one assigned location." };
  }

  const inviteToken  = crypto.randomBytes(24).toString("hex");
  const accessScope  = getInviteAccessScope(role, assignedLocations.map((l) => l.name));

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { name, email },
  });

  const membership = await prisma.userMembership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: {
      role, status: MembershipStatus.INVITED, accessScope, inviteToken,
      inviteSentAt: new Date(), invitedByUserId: currentMembership.userId,
      locationAccess: { deleteMany: {}, create: normalizedLocationIds.map((locationId) => ({ locationId })) },
    },
    create: {
      organizationId: organization.id, userId: user.id, role,
      status: MembershipStatus.INVITED, accessScope, inviteToken,
      inviteSentAt: new Date(), invitedByUserId: currentMembership.userId,
      locationAccess: normalizedLocationIds.length
        ? { create: normalizedLocationIds.map((locationId) => ({ locationId })) }
        : undefined,
    },
  });

  // Send invite email if Resend is configured; non-blocking fallback
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/accept-invite?token=${membership.inviteToken}`;
  let emailWarning: string | undefined;

  if (isEmailSendingConfigured()) {
    try {
      await sendTeamInviteEmail({
        to: email,
        inviteUrl,
        inviterName: currentMembership.user.name,
        orgName: organization.name,
        role: formatMembershipRole(role),
      });
    } catch {
      emailWarning = "Invite created but email could not be sent — share the link manually.";
    }
  } else {
    emailWarning = "Email is not configured — share the invite link manually.";
  }

  revalidatePath("/team");

  const flash = encodeURIComponent(`Invite created for ${email}${emailWarning ? " (see link below)" : " — email sent"}`);
  redirect(`/team?flash=${flash}&tone=success&invite=${membership.inviteToken}`);
}

// ── Accept invite ─────────────────────────────────────────────────────────────

export async function acceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const inviteToken = normalize(formData.get("inviteToken"));
  if (!inviteToken) return { error: "Invite token is required." };

  const membership = await prisma.userMembership.findFirst({
    where: { inviteToken, status: MembershipStatus.INVITED },
    include: { user: true },
  });
  if (!membership) return { error: "Invite not found or already used." };

  // Existing accounts already have a password. Accepting a new-location/org invite
  // only needs to activate the membership — never re-prompt for or overwrite the
  // user's existing password.
  if (membership.user.passwordHash) {
    await prisma.userMembership.update({
      where: { id: membership.id },
      data: { status: MembershipStatus.ACTIVE, inviteToken: null },
    });
    redirect("/login?flash=Invitation+accepted.+Access+added+to+your+account.&tone=success");
  }

  // Brand-new account: require the user to set a password before activating.
  const password        = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8)          return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: membership.userId },
    data: { passwordHash, emailVerified: new Date() },
  });

  await prisma.userMembership.update({
    where: { id: membership.id },
    data: { status: MembershipStatus.ACTIVE, inviteToken: null },
  });

  redirect("/login?flash=Invite+accepted.+You+can+sign+in+now.&tone=success");
}

// ── Reset invite ──────────────────────────────────────────────────────────────

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
      status: MembershipStatus.INVITED, inviteToken,
      inviteSentAt: new Date(), invitedByUserId: currentMembership.userId,
    },
  });

  revalidatePath("/team");
  redirect(`/team/${membershipId}?flash=${encodeURIComponent(`Invite reset for ${membership.user.email}`)}&tone=success`);
}

// ── Update role + location access ─────────────────────────────────────────────

export async function updateMemberRole(
  _prevState: UpdateMemberRoleState,
  formData: FormData,
): Promise<UpdateMemberRoleState> {
  const currentMembership = await requireTeamManagement();
  const membershipId  = normalize(formData.get("membershipId"));
  const roleValue     = normalize(formData.get("role"));
  const locationIds   = formData.getAll("locationIds").map((v) => String(v));

  if (!membershipId) return { error: "Membership ID is required." };
  if (!roleValue || !ROLE_OPTIONS.includes(roleValue as MembershipRole)) {
    return { error: "Invalid role selected." };
  }

  const newRole = roleValue as MembershipRole;

  const target = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });

  if (!target || target.organizationId !== currentMembership.organizationId) {
    return { error: "Member not found." };
  }

  // Guardrail: cannot edit a member with equal or higher role unless you are owner
  const currentLevel = ROLE_LEVEL[currentMembership.role];
  const targetLevel  = ROLE_LEVEL[target.role];
  if (currentMembership.role !== "OWNER" && targetLevel >= currentLevel) {
    return { error: "You do not have permission to edit this member's role." };
  }

  // Guardrail: cannot grant a role higher than your own
  if (ROLE_LEVEL[newRole] >= currentLevel && currentMembership.role !== "OWNER") {
    return { error: "You cannot grant a role equal to or higher than your own." };
  }

  // Guardrail: cannot change an owner's role (only owner can do that via a different flow)
  if (target.role === "OWNER") {
    return { error: "Owner role cannot be changed from this page." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: currentMembership.organizationId },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });
  if (!organization) return { error: "Organization not found." };

  const allowedLocationIds    = new Set(organization.locations.map((l) => l.id));
  const normalizedLocationIds = Array.from(new Set(locationIds.filter((id) => allowedLocationIds.has(id))));
  const assignedLocations     = organization.locations.filter((l) => normalizedLocationIds.includes(l.id));

  if (["MANAGER", "SUPPORT"].includes(newRole) && assignedLocations.length === 0) {
    return { error: "Managers and support users need at least one assigned location." };
  }

  const accessScope = getInviteAccessScope(newRole, assignedLocations.map((l) => l.name));

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: {
      role: newRole,
      accessScope,
      locationAccess: {
        deleteMany: {},
        create: normalizedLocationIds.map((locationId) => ({ locationId })),
      },
    },
  });

  revalidatePath("/team");
  revalidatePath(`/team/${membershipId}`);
  redirect(`/team/${membershipId}?flash=${encodeURIComponent(`Role updated to ${formatMembershipRole(newRole)}`)}&tone=success`);
}

// ── Deactivate member ─────────────────────────────────────────────────────────

export async function deactivateMember(membershipId: string) {
  const currentMembership = await requireTeamManagement();
  const errUrl = (msg: string) =>
    `/team/${membershipId}?flash=${encodeURIComponent(msg)}&tone=error`;

  const target = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, role: true, status: true, organizationId: true, user: { select: { email: true } } },
  });

  if (!target || target.organizationId !== currentMembership.organizationId) {
    redirect(errUrl("Member not found."));
  }

  if (target.id === currentMembership.id) {
    redirect(errUrl("You cannot deactivate your own account."));
  }

  const currentLevel = ROLE_LEVEL[currentMembership.role];
  const targetLevel  = ROLE_LEVEL[target.role];
  if (currentMembership.role !== "OWNER" && targetLevel >= currentLevel) {
    redirect(errUrl("You do not have permission to deactivate this member."));
  }

  if (target.role === "OWNER") {
    const ownerCount = await prisma.userMembership.count({
      where: { organizationId: currentMembership.organizationId, role: "OWNER", status: MembershipStatus.ACTIVE },
    });
    if (ownerCount <= 1) {
      redirect(errUrl("Cannot deactivate the last owner. Transfer ownership first."));
    }
  }

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipStatus.DISABLED, inviteToken: null },
  });

  revalidatePath("/team");
  redirect(`/team/${membershipId}?flash=${encodeURIComponent(`${target.user.email} has been deactivated`)}&tone=info`);
}

// ── Reactivate member ─────────────────────────────────────────────────────────

export async function reactivateMember(membershipId: string) {
  const currentMembership = await requireTeamManagement();
  const errUrl = (msg: string) =>
    `/team/${membershipId}?flash=${encodeURIComponent(msg)}&tone=error`;

  const target = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, role: true, status: true, organizationId: true, user: { select: { email: true } } },
  });

  if (!target || target.organizationId !== currentMembership.organizationId) {
    redirect(errUrl("Member not found."));
  }

  if (target.status !== MembershipStatus.DISABLED) {
    redirect(errUrl("This member is not currently deactivated."));
  }

  if (target.role === "OWNER" && currentMembership.role !== "OWNER") {
    redirect(errUrl("Only an owner can reactivate an owner-level account."));
  }

  await prisma.userMembership.update({
    where: { id: membershipId },
    data: { status: MembershipStatus.ACTIVE },
  });

  revalidatePath("/team");
  redirect(`/team/${membershipId}?flash=${encodeURIComponent(`${target.user.email} has been reactivated`)}&tone=success`);
}

// ── Transfer ownership ────────────────────────────────────────────────────────

const TRANSFER_CONFIRM_PHRASE = "transfer ownership";

export async function transferOwnership(formData: FormData) {
  const currentMembership = await requireTeamManagement();
  const membershipId  = normalize(formData.get("membershipId"));
  const confirmPhrase = normalize(formData.get("confirmPhrase"))?.toLowerCase();
  const errUrl = (msg: string) =>
    `/team/${membershipId ?? ""}?flash=${encodeURIComponent(msg)}&tone=error`;

  if (currentMembership.role !== "OWNER") {
    redirect(errUrl("Only the current owner can transfer ownership."));
  }

  if (!membershipId) {
    redirect(`/team?flash=${encodeURIComponent("Invalid request.")}&tone=error`);
  }

  if (confirmPhrase !== TRANSFER_CONFIRM_PHRASE) {
    redirect(errUrl("Confirmation phrase did not match. Transfer cancelled."));
  }

  const target = await prisma.userMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, role: true, status: true, organizationId: true, user: { select: { name: true } } },
  });

  if (!target || target.organizationId !== currentMembership.organizationId) {
    redirect(errUrl("Member not found."));
  }

  if (target.id === currentMembership.id) {
    redirect(errUrl("You cannot transfer ownership to yourself."));
  }

  if (target.status !== MembershipStatus.ACTIVE) {
    redirect(errUrl("Ownership can only be transferred to an active member."));
  }

  if (target.role === "OWNER") {
    redirect(errUrl("This member is already an owner."));
  }

  // Atomic: promote target → OWNER, demote current → ADMIN
  await prisma.$transaction([
    prisma.userMembership.update({
      where: { id: target.id },
      data: { role: MembershipRole.OWNER, accessScope: "All locations" },
    }),
    prisma.userMembership.update({
      where: { id: currentMembership.id },
      data: { role: MembershipRole.ADMIN, accessScope: "All locations" },
    }),
  ]);

  revalidatePath("/team");
  redirect(`/team?flash=${encodeURIComponent(`Ownership transferred to ${target.user.name}. You are now an Agency Admin.`)}&tone=success`);
}

export async function getInvitePreviewToken() {
  const membership = await getCurrentMembership();
  return membership?.id ?? null;
}
