import OpenAI from "openai";

export async function generateReplyDraft(review: {
  reviewerName: string;
  rating: number;
  body: string;
}): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const firstName = review.reviewerName.trim().split(/\s+/)[0] || "there";

  const prompt = `You are a professional business owner responding to a customer review. Write a warm, professional reply (2-4 sentences) to this ${review.rating}-star review from ${firstName}:

"${review.body}"

Rules:
- Address the content of the review directly
- Do not be sycophantic or use hollow phrases like "We are so thrilled"
- Sign off naturally without a formal signature line
- Write in first-person plural (we/our)
- Return only the reply text, no preamble`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}
