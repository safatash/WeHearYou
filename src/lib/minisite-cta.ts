export type CtaType = "CALL" | "WEBSITE" | "DIRECTIONS" | "BOOK" | "REVIEW";
export type ResolvedCta = { type: CtaType; label: string; href: string; external: boolean };

const DEFAULT_LABELS: Record<CtaType, string> = {
  CALL: "Call now",
  WEBSITE: "Visit website",
  DIRECTIONS: "Get directions",
  BOOK: "Book appointment",
  REVIEW: "Leave a review",
};

export function resolveCta(
  type: CtaType | null | undefined,
  opts: { label?: string | null; phone?: string | null; websiteUrl?: string | null; bookingUrl?: string | null; mapsUrl?: string | null; reviewUrl?: string | null },
): ResolvedCta | null {
  if (!type) return null;
  const label = opts.label?.trim() || DEFAULT_LABELS[type];
  switch (type) {
    case "CALL":
      return opts.phone ? { type, label, href: `tel:${opts.phone}`, external: false } : null;
    case "WEBSITE":
      return opts.websiteUrl ? { type, label, href: opts.websiteUrl, external: true } : null;
    case "DIRECTIONS":
      return opts.mapsUrl ? { type, label, href: opts.mapsUrl, external: true } : null;
    case "BOOK":
      return opts.bookingUrl ? { type, label, href: opts.bookingUrl, external: true } : null;
    case "REVIEW":
      return opts.reviewUrl ? { type, label, href: opts.reviewUrl, external: true } : null;
    default:
      return null;
  }
}
