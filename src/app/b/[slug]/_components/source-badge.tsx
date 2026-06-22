export type ReviewSource = "google" | "facebook" | "yelp" | "trustpilot";

const SOURCE_CONFIG: Record<ReviewSource, { label: string; color: string }> = {
  google: { label: "Google", color: "var(--src-google)" },
  facebook: { label: "Facebook", color: "var(--src-facebook)" },
  yelp: { label: "Yelp", color: "var(--src-yelp)" },
  trustpilot: { label: "Trustpilot", color: "var(--src-trustpilot)" },
};

export function SourceBadge({ source }: { source: ReviewSource | string }) {
  const config = SOURCE_CONFIG[source as ReviewSource];
  if (!config) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
        {source}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ background: config.color }}>
      {config.label}
    </span>
  );
}
