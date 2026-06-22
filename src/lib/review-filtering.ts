export type ReviewFilter =
  | "all" | "needs-reply" | "featured" | "hidden"
  | "5" | "4" | "1-3"
  | "google" | "facebook" | "yelp" | "trustpilot";

export type FilterableReview = {
  rating: number | null;
  source: string;
  isFeatured: boolean;
  isHiddenFromMiniSite: boolean;
  replyPublishedAt: Date | null;
  replySentAt: Date | null;
};

export const REVIEW_FILTERS: ReadonlyArray<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "needs-reply", label: "Needs reply" },
  { value: "featured", label: "Featured" },
  { value: "hidden", label: "Hidden from public page" },
  { value: "5", label: "5-star" },
  { value: "4", label: "4-star" },
  { value: "1-3", label: "1-3 star" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "yelp", label: "Yelp" },
  { value: "trustpilot", label: "Trustpilot" },
];

export function reviewNeedsReply(r: { replyPublishedAt: Date | null; replySentAt: Date | null }): boolean {
  return !r.replyPublishedAt && !r.replySentAt;
}

export function filterLocationReviews<T extends FilterableReview>(reviews: T[], filter: ReviewFilter): T[] {
  switch (filter) {
    case "all": return reviews;
    case "needs-reply": return reviews.filter(reviewNeedsReply);
    case "featured": return reviews.filter((r) => r.isFeatured);
    case "hidden": return reviews.filter((r) => r.isHiddenFromMiniSite);
    case "5": return reviews.filter((r) => r.rating === 5);
    case "4": return reviews.filter((r) => r.rating === 4);
    case "1-3": return reviews.filter((r) => (r.rating ?? 0) >= 1 && (r.rating ?? 0) <= 3);
    case "google":
    case "facebook":
    case "yelp":
    case "trustpilot":
      return reviews.filter((r) => r.source.toLowerCase() === filter);
    default: return reviews;
  }
}

export function sortFeaturedFirst<T extends { isFeatured: boolean }>(reviews: T[]): T[] {
  return [...reviews].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
}
