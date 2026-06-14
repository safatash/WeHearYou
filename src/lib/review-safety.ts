export type SafetyClassification = {
  isRisky: boolean;
  riskCategories: string[];
  reason: string;
};

const RISKY_PATTERNS = [
  { category: "medical", patterns: [/\b(medicine|medication|cure|treatment|drug|therapy|diagnosis|disease|health condition)\b/i] },
  { category: "legal", patterns: [/\b(lawsuit|attorney|lawyer|legal action|court|sue|prosecution)\b/i] },
  { category: "discrimination", patterns: [/\b(discriminat|racist|sexist|harass|abuse|bigot)\b/i] },
  { category: "personal_info", patterns: [/\b(social security|ssn|credit card|cvv|password|pin)\b/i] },
  { category: "financial_promise", patterns: [/\b(refund|compensation|money back|payment|reimburs)\b/i] },
];

export function classifyReviewSafety(replyText: string): SafetyClassification {
  if (!replyText || replyText.length === 0) {
    return {
      isRisky: false,
      riskCategories: [],
      reason: "Empty reply is safe",
    };
  }

  const foundCategories: string[] = [];

  for (const { category, patterns } of RISKY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(replyText)) {
        foundCategories.push(category);
        break;
      }
    }
  }

  const isRisky = foundCategories.length > 0;

  let reason = "Safe to send";
  if (isRisky) {
    reason = `Blocked: detected ${foundCategories.join(", ")} content`;
  }

  return {
    isRisky,
    riskCategories: foundCategories,
    reason,
  };
}
