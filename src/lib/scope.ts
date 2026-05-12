import { type TeamMemberWithRelations, getAssignedLocations } from "@/lib/team";

export function getAccessibleLocationIds(membership: TeamMemberWithRelations) {
  return getAssignedLocations(membership).map((location) => location.id);
}
