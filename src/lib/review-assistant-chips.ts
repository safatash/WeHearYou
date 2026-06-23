/**
 * Pure helpers for the AI Review Assistant's "experience chips" — the
 * selectable phrases a customer taps before generating a review.
 *
 * Sources (in priority order): AI-extracted review themes, category template,
 * the location's services, and admin custom chips. Kept dependency-free for
 * unit testing.
 */

export type ChipCategory = "dental" | "home_services" | "law" | "restaurant" | "default";

export const CATEGORY_CHIPS: Record<ChipCategory, string[]> = {
  dental: [
    "Friendly Staff", "Clean Office", "Gentle Care", "Great Dentist", "Easy Scheduling",
    "Helpful Front Desk", "Comfortable Visit", "Professional Team", "Explained Everything Clearly",
    "Short Wait Time", "Modern Technology",
  ],
  home_services: [
    "Arrived On Time", "Fair Pricing", "Professional Crew", "Great Communication", "Fast Service",
    "Honest Advice", "Quality Work", "Cleaned Up Afterwards", "Reliable", "Highly Recommend",
  ],
  law: [
    "Responsive", "Professional", "Knowledgeable", "Helpful Staff", "Great Communication",
    "Trustworthy", "Easy To Work With", "Strong Representation", "Clear Explanations",
  ],
  restaurant: [
    "Delicious Food", "Great Atmosphere", "Friendly Staff", "Fast Service", "Clean Restaurant",
    "Good Value", "Family Friendly", "Will Return",
  ],
  default: [
    "Friendly Staff", "Great Service", "Professional Team", "Fair Pricing", "Highly Recommend",
    "Great Communication", "Easy Process", "Would Recommend",
  ],
};

/** Map a free-form business category/type string to a chip template key. */
export function resolveChipCategory(businessType: string | null | undefined): ChipCategory {
  const t = (businessType ?? "").toLowerCase();
  if (/dent|orthodon|ortho|smile/.test(t)) return "dental";
  if (/law|legal|attorney|lawyer|firm/.test(t)) return "law";
  if (/restaurant|food|cafe|café|dining|eatery|bar|grill|pizz|kitchen/.test(t)) return "restaurant";
  if (/plumb|hvac|roof|clean|landscap|electric|contractor|home|repair|garage|pest|moving|handyman/.test(t)) return "home_services";
  return "default";
}

function titleCaseChip(s: string): string {
  return s.trim();
}

/**
 * Build the ordered, de-duplicated list of suggested chips. Themes/highlights
 * extracted from real reviews are prioritized, then the category template,
 * then services, then admin custom chips.
 */
export function buildSuggestedChips(input: {
  businessType?: string | null;
  services?: string[];
  reviewHighlights?: string[];
  customChips?: string[];
  useReviewThemes?: boolean;
  limit?: number;
}): string[] {
  const limit = input.limit ?? 18;
  const ordered: string[] = [];
  if (input.useReviewThemes !== false) ordered.push(...(input.reviewHighlights ?? []));
  ordered.push(...CATEGORY_CHIPS[resolveChipCategory(input.businessType)]);
  ordered.push(...(input.services ?? []));
  ordered.push(...(input.customChips ?? []));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ordered) {
    const chip = titleCaseChip(raw);
    if (!chip) continue;
    const key = chip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chip);
    if (out.length >= limit) break;
  }
  return out;
}
