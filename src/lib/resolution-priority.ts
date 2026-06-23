/**
 * Deterministic priority classification for resolution cases. Pure +
 * unit-tested. Reuses classifyReviewSafety for sensitive-content detection and
 * layers explicit rules on top.
 */
import { classifyReviewSafety } from "./review-safety";

export type ResolutionPriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const CRITICAL_RE =
  /\b(?:unsafe|injur\w*|hurt me|harm\w*|hospital|sue|suing|lawsuit|legal action|attorney|lawyer|fraud\w*|scam\w*|chargeback|charge ?back|dispute the charge|discriminat\w*|racist|sexist|harass\w*|threat\w*|dangerous|negligen\w*)\b/i;

const STRONG_FRUSTRATION_RE =
  /\b(never again|worst|furious|outrageous|unacceptable|disgusting|ridiculous|appalling|horrible|terrible experience|extremely (frustrated|upset|angry)|demand)\b/i;

const BILLING_RE = /bill|charge|refund|overcharg|payment|invoice|cost|price|money/i;
const MEDIUM_RE = /communicat|wait|response|service quality|slow|schedul|quality/i;

function hasCategory(categories: string[], re: RegExp): boolean {
  return categories.some((c) => re.test(c));
}

export function classifyPriority(input: {
  issueCategories?: string[];
  feedback?: string | null;
  contactRequested?: boolean;
}): ResolutionPriorityLevel {
  const categories = input.issueCategories ?? [];
  const text = (input.feedback ?? "").trim();

  // CRITICAL — safety / legal / discrimination / fraud / harassment / medical harm
  const safety = classifyReviewSafety(text);
  const criticalSafety = safety.riskCategories.some((c) => ["medical", "legal", "discrimination"].includes(c));
  if (criticalSafety || CRITICAL_RE.test(text)) {
    return "CRITICAL";
  }

  // HIGH — billing, contact requested, or strong frustration
  const billing =
    hasCategory(categories, /billing|unexpected cost|pricing|insurance/i) || BILLING_RE.test(text) || safety.riskCategories.includes("financial_promise");
  if (billing || input.contactRequested || STRONG_FRUSTRATION_RE.test(text)) {
    return "HIGH";
  }

  // MEDIUM — communication / wait time / service quality
  if (hasCategory(categories, MEDIUM_RE) || MEDIUM_RE.test(text)) {
    return "MEDIUM";
  }

  return "LOW";
}
