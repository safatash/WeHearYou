import { notFound } from "next/navigation";
import { getCurrentMembership, type MembershipOptions } from "@/lib/authz";
import { canManageContacts, canManageTeam, canReplyToReviews, canViewLocation } from "@/lib/team";

export async function requireActiveMembershipPage(options: MembershipOptions = {}) {
  // Enforcement (trial expiry / suspension) happens inside getCurrentMembership,
  // so every page using this guard is covered. Pass { allowSuspended: true } only
  // on the pages a suspended organization must still reach to pay.
  const membership = await getCurrentMembership(options);

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
