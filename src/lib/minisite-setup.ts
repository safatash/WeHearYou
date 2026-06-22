export type SetupChecklistItem = {
  key: "phone" | "website" | "source" | "featured" | "publish";
  label: string;
  done: boolean;
};

export function computeMiniSiteSetupChecklist(input: {
  phone: string | null;
  websiteUrl: string | null;
  hasConnectedSource: boolean;
  hasFeaturedReview: boolean;
  miniSitePublished: boolean;
}): SetupChecklistItem[] {
  return [
    { key: "phone", label: "Add phone number", done: Boolean(input.phone?.trim()) },
    { key: "website", label: "Add website", done: Boolean(input.websiteUrl?.trim()) },
    { key: "source", label: "Connect review source", done: input.hasConnectedSource },
    { key: "featured", label: "Select featured reviews", done: input.hasFeaturedReview },
    { key: "publish", label: "Publish mini page", done: input.miniSitePublished },
  ];
}
