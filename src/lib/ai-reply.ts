import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const TONE_INSTRUCTIONS: Record<string, string> = {
  Warm: "Be warm, friendly, and genuine — make the customer feel appreciated.",
  Professional: "Be professional and measured — confident tone without being stiff.",
  Concise: "Be brief and direct — reply in 1-2 sentences maximum.",
  Apologetic: "Lead with empathy and a sincere apology, then resolve or reassure.",
};

export async function generateReplyDraft(review: {
  reviewerName: string;
  rating: number;
  body: string;
  tone?: string;
}): Promise<string> {
  const firstName = review.reviewerName.trim().split(/\s+/)[0] || "there";
  const toneGuide = TONE_INSTRUCTIONS[review.tone ?? "Warm"] ?? TONE_INSTRUCTIONS.Warm;

  const prompt = `You are a professional business owner responding to a customer review. Write a reply (2-4 sentences) to this ${review.rating}-star review from ${firstName}.

Tone guidance: ${toneGuide}

Review: "${review.body}"

Rules:
- Address the content of the review directly
- Do not use hollow phrases like "We are so thrilled" or "We are so sorry to hear"
- Sign off naturally without a formal signature line
- Write in first-person plural (we/our)
- Return only the reply text, no preamble`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
