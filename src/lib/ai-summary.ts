import { GoogleGenerativeAI } from "@google/generative-ai";

export function parseHighlights(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.replace(/^[\s*\-\d.]+/, "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(p); }
    if (out.length === 5) break;
  }
  return out;
}

export async function generateAiReviewSummary(
  reviews: { rating: number; body: string }[]
): Promise<{ summary: string; highlights: string[] }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const reviewList = reviews
    .map((r, i) => `${i + 1}. [${r.rating} stars] ${r.body}`)
    .join("\n");

  const prompt = `You are writing a review highlight for a business's public profile. Your goal is to help the business put their best foot forward by celebrating what their customers love about them. Write a confident, warm 2–4 sentence summary based on the following ${reviews.length} customer reviews. Lead with the strongest and most frequently praised qualities. Use specific, vivid language drawn from what customers actually wrote — avoid generic filler phrases. Do not mention negatives unless a specific criticism appears repeatedly across many reviews and is impossible to ignore. Do not infer concerns from low star ratings that have no written explanation. Do not mention specific reviewers by name.

After the summary, on a new line write exactly:
HIGHLIGHTS: followed by 3–5 short highlight phrases (comma-separated, e.g. "Friendly staff, Fast service, Clean office").

Return only the summary text and the HIGHLIGHTS line — no other preamble or labels.

Reviews:
${reviewList}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error("Gemini returned an empty response");

  const highlightsMarker = "HIGHLIGHTS:";
  const markerIndex = text.indexOf(highlightsMarker);
  let summary: string;
  let highlights: string[];

  if (markerIndex !== -1) {
    summary = text.slice(0, markerIndex).trim();
    const rawHighlights = text.slice(markerIndex + highlightsMarker.length).trim();
    highlights = parseHighlights(rawHighlights);
  } else {
    summary = text;
    highlights = [];
  }

  return { summary, highlights };
}
