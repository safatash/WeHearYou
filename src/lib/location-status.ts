export type LocationStatus = "Active" | "Draft" | "Paused" | "Needs setup";

export function isMiniSiteProfileComplete(input: {
  phone: string | null;
  websiteUrl: string | null;
}): boolean {
  return Boolean(input.phone?.trim()) && Boolean(input.websiteUrl?.trim());
}

export function deriveLocationStatus(input: {
  miniSitePublished: boolean;
  miniSitePublishedAt: Date | null;
  hasConnectedSource: boolean;
  profileComplete: boolean;
}): LocationStatus {
  if (input.miniSitePublished && input.hasConnectedSource) return "Active";
  if (!input.hasConnectedSource || !input.profileComplete) return "Needs setup";
  if (input.miniSitePublishedAt) return "Paused";
  return "Draft";
}
