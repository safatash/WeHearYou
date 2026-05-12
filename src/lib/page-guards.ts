import { notFound } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { canManageContacts, canManageTeam, canReplyToReviews, canViewLocation } from "@/lib/team";

export async function requireActiveMembershipPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    notFound();
  }

  return membership;
}

export async function requireTeamAccessPage() {
  const membership = await requireActiveMembershipPage();

  if (!canManageTeam(membership)) {
    notFound();
  }

  return membership;
}

export async function requireLocationAccessPage(locationId: string) {
  const membership = await requireActiveMembershipPage();

  if (!canViewLocation(membership, locationId)) {
    notFound();
  }

  return membership;
}

export async function requireContactManagementPage(locationId: string) {
  const membership = await requireActiveMembershipPage();

  if (!canManageContacts(membership, locationId)) {
    notFound();
  }

  return membership;
}

export async function requireReviewAccessPage(locationId: string) {
  const membership = await requireActiveMembershipPage();

  if (!canReplyToReviews(membership, locationId)) {
    notFound();
  }

  return membership;
}
