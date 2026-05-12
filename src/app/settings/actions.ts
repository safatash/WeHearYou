"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess, requireTeamManagement } from "@/lib/authz";

export async function updateOrganizationSettings(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!organizationId) {
    throw new Error("Organization is required");
  }

  await requireTeamManagement();
  await requireOrganizationAccess(organizationId);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim() || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/integrations");
  revalidatePath("/team");

  redirect("/settings?flash=Organization+settings+saved&tone=success");
}
