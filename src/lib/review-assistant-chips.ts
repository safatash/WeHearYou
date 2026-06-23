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
 * Theme rules: map a chip label to keyword patterns. Used to extract the most
 * common themes directly from real review text, so suggested chips reflect what
 * customers actually praise — independent of any AI summary or LLM call.
 */
const THEME_RULES: { label: string; re: RegExp }[] = [
  { label: "Great Communication", re: /communicat|responsive|kept (me|us) (updated|informed|in the loop)|easy to reach|quick to respond/i },
  { label: "Improved SEO & Rankings", re: /\bseo\b|search engine|ranking|rank(ed|s|ing)?\b|google search|first page|keyword|organic traffic|visibility/i },
  { label: "Increased Our Traffic", re: /traffic|more (leads|customers|clients|calls|business)|lead generation|conversions?\b/i },
  { label: "Great Website Design", re: /website|web design|web site|landing page|\bsite\b|redesign|new design/i },
  { label: "Real Results", re: /results?|roi|return on investment|grew|growth|increase[ds]?|boost(ed)?|doubled|tripled|sales went up/i },
  { label: "Professional Team", re: /professional|professionalism/i },
  { label: "Friendly Staff", re: /friendly|kind|welcoming|courteous|pleasant|so nice/i },
  { label: "Knowledgeable", re: /knowledg|expert|expertise|skilled|experienced|know their stuff/i },
  { label: "Fair Pricing", re: /\bprice|pricing|afford|great value|worth (it|every)|reasonable|cost-effective/i },
  { label: "Fast Service", re: /\bfast\b|quick(ly)?|prompt|speedy|turnaround|right away/i },
  { label: "Met Deadlines", re: /deadline|on time|on schedule|delivered (on|early)|timely/i },
  { label: "Easy To Work With", re: /easy to work with|smooth|seamless|hassle[- ]free|stress[- ]free|painless|easy process/i },
  { label: "Quality Work", re: /quality|great work|excellent work|attention to detail|top[- ]notch|high[- ]quality/i },
  { label: "Trustworthy", re: /trust|honest|reliable|dependable|transparen/i },
  { label: "Highly Recommend", re: /recommend/i },
  { label: "Went Above & Beyond", re: /above and beyond|exceed|impressed|amazing|outstanding|exceptional|blew (me|us) away/i },
  { label: "Helpful", re: /helpful|patient|guided|walked (me|us) through/i },
];

/**
 * Count how often each theme appears across review bodies and return the
 * most-mentioned theme labels (highest first). Pure + unit-tested.
 */
export function extractReviewThemes(
  reviews: { body?: string | null; rating?: number | null }[],
  options?: { minRating?: number; limit?: number },
): string[] {
  const minRating = options?.minRating ?? 4;
  const limit = options?.limit ?? 8;

  const counts = new Map<string, number>();
  for (const r of reviews) {
    if (typeof r.rating === "number" && r.rating < minRating) continue;
    const body = (r.body ?? "").trim();
    if (!body) continue;
    for (const rule of THEME_RULES) {
      if (rule.re.test(body)) counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || THEME_RULES.findIndex((t) => t.label === a[0]) - THEME_RULES.findIndex((t) => t.label === b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

/**
 * Build the ordered, de-duplicated list of suggested chips. Themes extracted
 * from real reviews are prioritized, then AI-summary highlights, then the
 * category template, then services, then admin custom chips.
 */
export function buildSuggestedChips(input: {
  businessType?: string | null;
  services?: string[];
  reviewThemes?: string[];
  reviewHighlights?: string[];
  customChips?: string[];
  useReviewThemes?: boolean;
  limit?: number;
}): string[] {
  const limit = input.limit ?? 18;
  const ordered: string[] = [];
  if (input.useReviewThemes !== false) {
    ordered.push(...(input.reviewThemes ?? []));
    ordered.push(...(input.reviewHighlights ?? []));
  }
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
