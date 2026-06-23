/**
 * Issue chips for the Customer Resolution Assistant — category-specific
 * "what best describes the issue?" options. Pure + unit-testable. Reuses the
 * same business-category resolution as the review-assistant chips.
 */
import { resolveChipCategory, type ChipCategory } from "./review-assistant-chips";

export const GENERAL_ISSUES = [
  "Long Wait Time",
  "Poor Communication",
  "Scheduling Issue",
  "Billing Concern",
  "Staff Interaction",
  "Service Quality",
  "Unexpected Cost",
  "Problem Not Resolved",
  "Cleanliness Concern",
  "Other",
];

export const CATEGORY_ISSUES: Record<Exclude<ChipCategory, "default">, string[]> = {
  dental: [
    "Wait Time",
    "Insurance Issue",
    "Billing Concern",
    "Pain Or Discomfort",
    "Treatment Explanation",
    "Front Desk Experience",
    "Scheduling Problem",
  ],
  home_services: [
    "Late Arrival",
    "Pricing Concern",
    "Incomplete Work",
    "Poor Communication",
    "Warranty Issue",
    "Quality Concern",
  ],
  law: [
    "Slow Response",
    "Communication Issue",
    "Billing Concern",
    "Case Update Concern",
    "Unclear Process",
  ],
  restaurant: [
    "Food Quality",
    "Slow Service",
    "Order Issue",
    "Reservation Issue",
    "Staff Interaction",
  ],
};

/** Return the issue chips for a location's business category (general always appended as fallback). */
export function buildIssueChips(businessType: string | null | undefined): string[] {
  const category = resolveChipCategory(businessType);
  const base = category === "default" ? [] : CATEGORY_ISSUES[category];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chip of [...base, ...GENERAL_ISSUES]) {
    const key = chip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chip);
  }
  return out;
}
