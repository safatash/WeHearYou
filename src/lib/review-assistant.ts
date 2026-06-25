/**
 * AI Review Assistant generation — reuses the existing Gemini Flash client
 * (see src/lib/ai-summary.ts) to help a customer turn tapped phrases into an
 * authentic, editable review. Never fabricates; the customer always edits and
 * posts it themselves.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { classifyReviewSafety } from "@/lib/review-safety";

export type AssistantEditMode = "improve" | "shorter" | "longer" | "casual" | "professional";
export type AssistantTone = "friendly" | "professional" | "casual" | "enthusiastic";
export type AssistantLength = "short" | "medium" | "detailed";

export const ASSISTANT_TONES: AssistantTone[] = ["friendly", "professional", "casual", "enthusiastic"];
export const ASSISTANT_LENGTHS: AssistantLength[] = ["short", "medium", "detailed"];

/** Word-count band per length option. */
export const LENGTH_WORDS: Record<AssistantLength, [number, number]> = {
  short: [40, 60],
  medium: [80, 120],
  detailed: [120, 180],
};

export function normalizeTone(raw: string | null | undefined): AssistantTone {
  return ASSISTANT_TONES.includes(raw as AssistantTone) ? (raw as AssistantTone) : "friendly";
}

export function normalizeLength(raw: string | null | undefined): AssistantLength {
  return ASSISTANT_LENGTHS.includes(raw as AssistantLength) ? (raw as AssistantLength) : "medium";
}

export interface AssistantContext {
  businessName: string;
  locationName?: string | null;
  city?: string | null;
  state?: string | null;
  businessCategory?: string | null;
  service?: string | null;
  staffMember?: string | null;
  selectedPhrases: string[];
  customerNotes?: string | null;
  topReviewThemes?: string[];
  tone: AssistantTone;
  length: AssistantLength;
  includeBusiness?: boolean;
  includeCity?: boolean;
  includeService?: boolean;
  editMode?: AssistantEditMode;
  existingDraft?: string;
}

/** Compose the Gemini prompt. Pure + unit-tested. */
export function buildReviewAssistantPrompt(ctx: AssistantContext): string {
  const draft = (ctx.existingDraft ?? "").trim();
  if (draft && ctx.editMode) {
    const instructionMap: Record<AssistantEditMode, string> = {
      improve: "Improve the writing — clearer, more natural and well-structured",
      shorter: "Make it shorter and more concise",
      longer: "Make it a little longer and more detailed",
      casual: "Make it sound more casual and conversational",
      professional: "Make it sound more professional and polished",
    };
    const instruction = instructionMap[ctx.editMode];
    return [
      "You are helping a real customer refine their own online review. Here is the customer's current review draft:",
      `"""${draft}"""`,
      "",
      `Rewrite it to: ${instruction}.`,
      "Rules:",
      "- Preserve the customer's meaning, facts, and personal voice. Do not invent details or change what happened.",
      "- Do NOT make medical, legal, or financial guarantees or claims.",
      "- Return ONLY the revised review text — no preamble, quotes, labels, or options.",
    ].join("\n");
  }

  const [minWords, maxWords] = LENGTH_WORDS[ctx.length];
  const phrases = ctx.selectedPhrases.filter(Boolean);
  const themes = (ctx.topReviewThemes ?? []).filter(Boolean);

  const lines: string[] = [];
  lines.push(
    `You are helping a real customer put their own positive experience into words for an online review. Write a single review draft in the first person ("I"/"we") that sounds like a genuine, everyday customer wrote it — natural, specific, and warm, never like marketing copy.`,
  );
  lines.push("");
  lines.push("Rules:");
  lines.push(`- Tone: ${ctx.tone}.`);
  lines.push(`- Length: between ${minWords} and ${maxWords} words.`);
  if (phrases.length) {
    lines.push(`- Naturally weave in these things the customer chose: ${phrases.join(", ")}.`);
  }
  if (ctx.includeBusiness !== false) {
    lines.push(`- Mention the business by name ("${ctx.businessName}") once, naturally.`);
  } else {
    lines.push(`- Do not invent or emphasize the business name.`);
  }
  if (ctx.includeCity !== false && ctx.city) {
    lines.push(`- You may mention the city (${ctx.city}) once if it fits naturally.`);
  } else {
    lines.push(`- Do not mention the city or location keywords.`);
  }
  if (ctx.includeService !== false && ctx.service) {
    lines.push(`- Refer to the service ("${ctx.service}") naturally if relevant.`);
  }
  if (ctx.staffMember) {
    lines.push(`- The customer was helped by ${ctx.staffMember}; you may thank them by first name.`);
  }
  if (ctx.customerNotes) {
    lines.push(`- Incorporate the customer's own note where it fits: "${ctx.customerNotes}".`);
  }
  lines.push(
    "- Do NOT keyword-stuff (no repeated city+service combinations). Do NOT fabricate details, exaggerate, or invent specifics the customer did not provide.",
  );
  lines.push(
    "- Do NOT make medical, legal, or financial guarantees or claims. No promises of outcomes, refunds, or results.",
  );
  lines.push("- Return ONLY the review text — no preamble, quotes, labels, or options.");

  if (themes.length) {
    lines.push("");
    lines.push(`For reference, other happy customers often mention: ${themes.join(", ")}.`);
  }

  return lines.join("\n");
}

/** Plain phrase-only fallback used if generation is empty or repeatedly unsafe. */
function fallbackReview(ctx: AssistantContext): string {
  const phrases = ctx.selectedPhrases.filter(Boolean);
  const biz = ctx.includeBusiness !== false ? ` at ${ctx.businessName}` : "";
  const highlights = phrases.length ? ` ${phrases.join(", ")}.` : "";
  return `I had a great experience${biz}.${highlights} I would recommend them.`.replace(/\s+/g, " ").trim();
}

export interface GenerateResult {
  review: string;
  safetyAdjusted: boolean;
}

/**
 * Generate a draft via Gemini Flash. Runs a soft safety check: if the keyword
 * classifier flags the draft, regenerate once with an explicit avoidance
 * instruction, then fall back to a neutral phrase-only draft. This keeps
 * legitimate reviews (which can contain words like "treatment") usable while
 * still screening for guarantee/claim language.
 */
export async function generateAssistedReview(ctx: AssistantContext): Promise<GenerateResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("AI is not configured");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const basePrompt = buildReviewAssistantPrompt(ctx);

  const run = async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^["']|["']$/g, "").trim();
  };

  const text = await run(basePrompt);
  if (!text) {
    return { review: fallbackReview(ctx), safetyAdjusted: true };
  }

  if (classifyReviewSafety(text).isRisky) {
    const retryPrompt = `${basePrompt}\n\nIMPORTANT: Avoid any wording that could read as a medical, legal, or financial claim, promise, guarantee, or sensitive personal detail. Keep it to a simple, genuine description of a good experience.`;
    const retry = await run(retryPrompt);
    if (retry && !classifyReviewSafety(retry).isRisky) {
      return { review: retry, safetyAdjusted: true };
    }
    return { review: fallbackReview(ctx), safetyAdjusted: true };
  }

  return { review: text, safetyAdjusted: false };
}
