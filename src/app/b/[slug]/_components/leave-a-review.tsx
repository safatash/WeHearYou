import type { ReviewSource } from "./source-badge";
import { SourceBadge } from "./source-badge";

export interface ReviewSourceLink {
  source: ReviewSource;
  href: string;
  label?: string;
}

export interface LeaveAReviewProps {
  sources: ReviewSourceLink[];
  heading?: string;
  subheading?: string;
}

export function LeaveAReview({
  sources,
  heading = "Share your experience",
  subheading = "Your feedback helps others discover great businesses.",
}: LeaveAReviewProps) {
  if (sources.length === 0) return null;

  return (
    <section
      className="rounded-3xl border p-6 shadow-sm"
      style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
    >
      <h2 className="text-lg font-semibold" style={{ color: "var(--ink-950)" }}>
        {heading}
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-500)" }}>
        {subheading}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {sources.map(({ source, href, label }) => (
          <a
            key={source}
            href={href}
            target="_blank"
            rel="noreferrer"
            data-track="review"
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-80"
            style={{ borderColor: "var(--ink-200)", background: "var(--white)", color: "var(--ink-700)" }}
          >
            <SourceBadge source={source} />
            {label ?? `Review on ${source.charAt(0).toUpperCase() + source.slice(1)}`}
          </a>
        ))}
      </div>
    </section>
  );
}
