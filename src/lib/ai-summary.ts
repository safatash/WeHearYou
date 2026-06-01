import OpenAI from "openai";

export async function generateAiReviewSummary(
  reviews: { rating: number; body: string }[]
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const reviewList = reviews
    .map((r, i) => `${i + 1}. [${r.rating} stars] ${r.body}`)
    .join("\n");

  const prompt = `You are writing a review highlight for a business's public profile. Your goal is to help the business put their best foot forward by celebrating what their customers love about them. Write a confident, warm 2–4 sentence summary based on the following ${reviews.length} customer reviews. Lead with the strongest and most frequently praised qualities. Use specific, vivid language drawn from what customers actually wrote — avoid generic filler phrases. Do not mention negatives unless a specific criticism appears repeatedly across many reviews and is impossible to ignore. Do not infer concerns from low star ratings that have no written explanation. Do not mention specific reviewers by name. Return only the summary text, no preamble or labels.

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
