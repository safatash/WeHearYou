/**
 * Customer Resolution Assistant — Gemini Flash helpers (mirrors
 * src/lib/review-assistant.ts). Three AI tasks:
 *   - customer_resolution_feedback_rewrite : clarity-only rewrite (never changes meaning)
 *   - customer_resolution_summary          : internal case summary for the business
 *   - customer_resolution_response_draft   : draft business response (never auto-sent)
 *
 * Compliance: AI may clarify, summarize, and draft. It may NOT change the
 * substance, sentiment, or facts of customer feedback.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResolutionPriorityLevel } from "./resolution-priority";

export interface RewriteContext {
  issueCategories?: string[];
}

export interface CaseSummaryContext {
  rating: number;
  issueCategories: string[];
  feedback: string;
  requestedOutcome?: string | null;
  contactPreference: "PHONE" | "EMAIL" | "NONE";
  priority: ResolutionPriorityLevel;
}

export interface ResponseDraftContext {
  businessName: string;
  customerName?: string | null;
  issueCategories: string[];
  feedback: string;
  requestedOutcome?: string | null;
}

function geminiModel() {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI is not configured");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

async function run(prompt: string): Promise<string> {
  const result = await geminiModel().generateContent(prompt);
  return result.response.text().trim().replace(/^["']|["']$/g, "").trim();
}

/* ── 1. Feedback clarity rewrite ─────────────────────────────────────────── */

export function buildRewritePrompt(feedback: string, ctx: RewriteContext = {}): string {
  const issues = (ctx.issueCategories ?? []).filter(Boolean);
  return [
    "A customer wrote the feedback below about a negative experience. Rewrite it ONLY to improve clarity, structure, readability, and a calm professional tone — keeping it in the customer's first-person voice.",
    "",
    "You MUST:",
    "- Preserve every concern and complaint the customer raised.",
    "- Preserve the customer's sentiment and level of dissatisfaction.",
    "You MUST NOT:",
    "- Remove or soften any complaint.",
    "- Add positivity, praise, gratitude, or any detail the customer did not state.",
    "- Invent facts, names, dates, or specifics.",
    "- Change what the customer is actually saying.",
    issues.length ? `\nThe customer flagged these issue areas: ${issues.join(", ")}.` : "",
    "",
    "Return ONLY the rewritten feedback text — no preamble, labels, or quotes.",
    "",
    `Customer feedback:\n${feedback}`,
  ].join("\n");
}

export async function rewriteFeedbackForClarity(feedback: string, ctx: RewriteContext = {}): Promise<string> {
  const text = await run(buildRewritePrompt(feedback, ctx));
  return text || feedback;
}

/* ── 2. Internal case summary ────────────────────────────────────────────── */

export function buildCaseSummaryPrompt(ctx: CaseSummaryContext): string {
  return [
    "Summarize this customer complaint for the business's internal resolution team. Be factual and neutral — do not invent details beyond what is provided.",
    "",
    `Rating: ${ctx.rating} stars`,
    `Issue categories: ${ctx.issueCategories.join(", ") || "Not specified"}`,
    `Requested outcome: ${ctx.requestedOutcome || "Not specified"}`,
    `Contact preference: ${ctx.contactPreference}`,
    `Priority: ${ctx.priority}`,
    "",
    `Customer feedback:\n${ctx.feedback}`,
    "",
    "Write 2–4 sentences covering: what the customer's core concern is, what outcome they want, and one concrete suggested next step for the business. Return ONLY the summary text.",
  ].join("\n");
}

export async function summarizeCase(ctx: CaseSummaryContext): Promise<string> {
  return run(buildCaseSummaryPrompt(ctx));
}

/* ── 3. Business response draft ──────────────────────────────────────────── */

export function buildResponseDraftPrompt(ctx: ResponseDraftContext): string {
  const name = (ctx.customerName ?? "").trim();
  return [
    `Draft a private response from ${ctx.businessName} to a customer who shared the concern below. This is a draft the business will review and edit before sending — never auto-sent.`,
    "",
    "The response MUST:",
    "- Acknowledge the customer's specific concern.",
    "- Thank them for sharing the feedback.",
    "- Be warm, professional, and non-defensive.",
    "- Encourage continued direct communication to resolve it.",
    "The response MUST NOT:",
    "- Admit fault or legal liability.",
    "- Make guarantees, promises of refunds, or specific outcomes.",
    "- Be dismissive or argue with the customer.",
    name ? `\nAddress the customer by first name (${name.split(/\s+/)[0]}) if natural.` : "",
    ctx.issueCategories.length ? `Issue areas: ${ctx.issueCategories.join(", ")}.` : "",
    ctx.requestedOutcome ? `The customer asked for: ${ctx.requestedOutcome}.` : "",
    "",
    `Customer's concern:\n${ctx.feedback}`,
    "",
    "Return ONLY the response text (3–6 sentences) — no preamble or labels.",
  ].join("\n");
}

export async function draftCaseResponse(ctx: ResponseDraftContext): Promise<string> {
  return run(buildResponseDraftPrompt(ctx));
}
