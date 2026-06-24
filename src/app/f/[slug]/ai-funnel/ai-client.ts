export type ToneAction = "regen" | "shorter" | "longer" | "casual" | "professional";
export type AssistantTone = "friendly" | "professional" | "casual" | "enthusiastic";
export type AssistantLength = "short" | "medium" | "detailed";

export interface GenerateParams {
  locationId: string;
  rating: number;
  selectedPhrases: string[];
  service: string;
  staffMember: string;
  notes: string;
  tone: AssistantTone;
  length: AssistantLength;
  sessionId: string | null;
  isRegenerate: boolean;
}

export function mapToneAction(
  action: ToneAction,
  cur: { tone: AssistantTone; length: AssistantLength }
): { tone: AssistantTone; length: AssistantLength; isRegenerate: boolean } {
  if (action === "regen") {
    return { tone: cur.tone, length: cur.length, isRegenerate: true };
  }
  if (action === "shorter") {
    return { tone: cur.tone, length: "short", isRegenerate: false };
  }
  if (action === "longer") {
    return { tone: cur.tone, length: "detailed", isRegenerate: false };
  }
  if (action === "casual") {
    return { tone: "casual", length: cur.length, isRegenerate: false };
  }
  // professional
  return { tone: "professional", length: cur.length, isRegenerate: false };
}

export async function generateReview(
  p: GenerateParams
): Promise<{ review: string; sessionId: string | null; usedFallback: boolean }> {
  try {
    const res = await fetch("/api/review-assistant/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.review) {
        return { review: "", sessionId: p.sessionId, usedFallback: true };
      }
      return {
        review: data.review,
        sessionId: data.sessionId ?? p.sessionId,
        usedFallback: false,
      };
    }
    return { review: "", sessionId: p.sessionId, usedFallback: true };
  } catch {
    return { review: "", sessionId: p.sessionId, usedFallback: true };
  }
}

export async function clarifyFeedbackRemote(
  locationId: string,
  feedback: string,
  issues: string[]
): Promise<{ rewritten: string; usedFallback: boolean }> {
  try {
    const res = await fetch("/api/customer-resolution/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, feedback, issueCategories: issues }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.rewritten) {
        return { rewritten: "", usedFallback: true };
      }
      return { rewritten: data.rewritten, usedFallback: false };
    }
    return { rewritten: "", usedFallback: true };
  } catch {
    return { rewritten: "", usedFallback: true };
  }
}
