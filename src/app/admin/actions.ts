"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { isPlanId } from "@/lib/plans";

export async function setOrgBillingAsAdmin(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID required");

  const planId = String(formData.get("planId") ?? "").trim();
  const extendDays = Number(formData.get("extendTrialDays") ?? 0);
  const clearSuspended = formData.get("clearSuspended") === "on";

  const data: { planId?: string; trialEndsAt?: Date; suspendedAt?: null } = {};
  if (isPlanId(planId)) data.planId = planId;
  if (Number.isFinite(extendDays) && extendDays > 0) {
    data.trialEndsAt = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
  }
  if (clearSuspended) data.suspendedAt = null;

  await prisma.organization.update({ where: { id: orgId }, data });

  revalidatePath(`/admin/orgs/${orgId}`);
  redirect(`/admin/orgs/${orgId}?flash=Billing+updated`);
}

export async function updateOrgAsAdmin(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;

  if (!orgId || !name || !slug) {
    throw new Error("Organization ID, name, and slug are required");
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { name, slug, website },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  redirect(`/admin/orgs/${orgId}?flash=Organization+updated`);
}

export async function suspendOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt: new Date() },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin/orgs");
  redirect(`/admin/orgs/${orgId}?flash=Organization+suspended`);
}

export async function unsuspendOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt: null },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin/orgs");
  redirect(`/admin/orgs/${orgId}?flash=Organization+reactivated`);
}

export async function deleteOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.delete({ where: { id: orgId } });

  revalidatePath("/admin/orgs");
  redirect("/admin/orgs?flash=Organization+deleted");
}

export async function startImpersonation(formData: FormData) {
  await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID required");

  const membership = await prisma.userMembership.findFirst({
    where: { userId, status: MembershipStatus.ACTIVE },
    select: { id: true },
  });
  if (!membership) throw new Error("User has no active membership");

  const jar = await cookies();
  jar.set("why_impersonate", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/");
}

export async function stopImpersonation() {
  const jar = await cookies();
  jar.delete("why_impersonate");
  redirect("/admin/orgs");
}

export async function promoteToSuperAdmin(formData: FormData) {
  await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: true },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?flash=User+promoted+to+superadmin`);
}

export async function revokeSuperAdmin(formData: FormData) {
  const caller = await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID is required");

  if (caller.id === userId) {
    throw new Error("You cannot revoke your own superadmin access");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: false },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?flash=Superadmin+access+revoked`);
}
