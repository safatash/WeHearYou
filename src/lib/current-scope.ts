import { getCurrentMembership } from "@/lib/authz";
import { getAccessibleLocationIds } from "@/lib/scope";

export async function getCurrentAccessibleLocationIds() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return [];
  }

  return getAccessibleLocationIds(membership);
}
