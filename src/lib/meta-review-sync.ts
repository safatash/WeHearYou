export type ReviewSnapshot = {
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export function hasMetaReviewChanged(
  existing: ReviewSnapshot,
  incoming: ReviewSnapshot,
): boolean {
  return (
    existing.reviewerName !== incoming.reviewerName ||
    existing.rating !== incoming.rating ||
    existing.body !== incoming.body ||
    existing.sourceUpdatedAt?.getTime() !== incoming.sourceUpdatedAt?.getTime()
  );
}

export function normalizeMetaReviewerName(name?: string | null): string {
  if (!name) return "Facebook reviewer";
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Facebook reviewer";
}

export function normalizeMetaReviewText(text?: string | null): string {
  if (!text) return "No written review provided.";
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : "No written review provided.";
}
