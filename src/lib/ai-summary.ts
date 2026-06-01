import OpenAI from "openai";

export async function generateAiReviewSummary(
  reviews: { rating: number; body: string }[]
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const reviewList = reviews
    .map((r, i) => `${i + 1}. [${r.rating} stars] ${r.body}`)
    .join("\n");

  const prompt = `You are summarizing customer reviews for a business. Write a 2–4 sentence summary of the following reviews. Surface the most common positive themes and any recurring negatives. Do not mention specific reviewers by name. Return only the summary text, no preamble or labels.

Reviews:
${reviewList}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.5,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}
