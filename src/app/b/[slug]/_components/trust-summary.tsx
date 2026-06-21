export interface TrustSummaryProps {
  avgRating: number;
  reviewCount: number;
  recentActivityLabel?: string | null;
  aiSummary?: string | null;
  aiSummaryReviewCount?: number | null;
  highlights?: string[];
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span style={{ color: "var(--star)" }} className="text-2xl">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

export function TrustSummary({
  avgRating,
  reviewCount,
  recentActivityLabel,
  aiSummary,
  aiSummaryReviewCount,
  highlights = [],
}: TrustSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Rating block */}
      <div
        className="rounded-3xl border p-5 shadow-sm"
        style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
          Rating summary
        </h2>
        <div className="mt-4">
          <p className="text-4xl font-bold" style={{ color: "var(--ink-950)" }}>
            {avgRating.toFixed(1)}
          </p>
          <StarRating rating={avgRating} />
          <p className="mt-1 text-xs" style={{ color: "var(--ink-500)" }}>
            {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
          </p>
          {recentActivityLabel && (
            <p className="mt-2 text-xs" style={{ color: "var(--accent-strong)" }}>
              {recentActivityLabel}
            </p>
          )}
        </div>
      </div>

      {/* AI summary */}
      {aiSummary && (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ background: "var(--accent-softer)", borderColor: "var(--accent-border)" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: "var(--accent-strong)" }}>
              ✦ AI Summary
            </p>
            {aiSummaryReviewCount != null && (
              <p className="text-xs" style={{ color: "var(--accent)" }}>
                Based on {aiSummaryReviewCount} reviews
              </p>
            )}
          </div>
          <p className="text-sm leading-7" style={{ color: "var(--ink-800)" }}>
            {aiSummary}
          </p>
        </div>
      )}

      {/* Highlight chips */}
      {highlights.length > 0 && (
        <div
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-950)" }}>
            Highlights
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {highlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
