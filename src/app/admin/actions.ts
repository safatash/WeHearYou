"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

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
  await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: false },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?flash=Superadmin+access+revoked`);
}
