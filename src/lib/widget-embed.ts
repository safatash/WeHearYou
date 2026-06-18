// Shared, unit-tested mapping that decides which renderer the public embed
// script should use for a widget. Computed server-side and passed to the embed
// as `renderKind` so the client never has to guess from raw type/layout strings.

export type EmbedRenderKind = "collecting" | "floating" | "single" | "badge" | "list";

// Widget types the renderer explicitly understands. A non-empty widgetType
// outside this set is genuinely unknown and should be logged (not silently
// rendered as some other known type).
const KNOWN_WIDGET_TYPES = new Set([
  "WALL_OF_LOVE",
  "SINGLE_TESTIMONIAL",
  "TESTIMONIAL",
  "BADGE",
  "COLLECTING",
  "FLOATING",
]);

export function isKnownWidgetType(widgetType?: string | null): boolean {
  const t = String(widgetType ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return t.length === 0 || KNOWN_WIDGET_TYPES.has(t);
}

/**
 * Resolve the embed render kind from a widget's type and layout.
 *
 * Normalizes casing/slug variants so values like "single_testimonial",
 * "single-testimonial", "single testimonial" or a bare "testimonial" all map to
 * the Single Testimonial renderer. Unknown widgets fall back to the standard
 * review list/grid ("list") — never silently to Badge.
 */
export function resolveEmbedRenderKind(widgetType?: string | null, layout?: string | null): EmbedRenderKind {
  const t = String(widgetType ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const l = String(layout ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (t === "COLLECTING") return "collecting";
  if (t === "FLOATING" || l === "floating") return "floating";
  if (
    t === "SINGLE_TESTIMONIAL" ||
    t === "TESTIMONIAL" ||
    l === "single" ||
    l === "single-testimonial" ||
    l === "testimonial"
  ) {
    return "single";
  }
  if (t === "BADGE" || l === "badge") return "badge";
  return "list";
}

/**
 * AI summary visibility for the public embed. The location-level
 * `showAiReviewSummary` flag is already applied when building the payload, so by
 * the time the embed has `aiReviewSummary` text it should be shown. Returns
 * false (and the embed renders nothing — no empty placeholder) when absent.
 */
export function embedShowsAiSummary(aiReviewSummary?: string | null): boolean {
  return typeof aiReviewSummary === "string" && aiReviewSummary.trim().length > 0;
}
