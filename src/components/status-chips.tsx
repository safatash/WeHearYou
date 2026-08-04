import { Icon } from "@/components/icon";

type TestimonialForChips = {
  videoUrl: string | null;
  status: string;
  caption: string | null;
  thumbnailSource: string;
};

function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />;
}

function SparkleGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
    </svg>
  );
}

/** Status + thumbnail-source pills, styled to the app design system (matches the mockup card). */
export function StatusChips({ vt }: { vt: TestimonialForChips }) {
  const status = !vt.videoUrl
    ? { label: "Awaiting video", cls: "badge-neutral", dot: "var(--ink-400)" }
    : vt.status === "APPROVED"
    ? { label: "Published", cls: "badge-success", dot: "var(--success)" }
    : vt.status === "REJECTED"
    ? { label: "Rejected", cls: "badge-danger", dot: "var(--danger)" }
    : { label: "Awaiting review", cls: "badge-warning", dot: "var(--warning)" };

  const thumbChip = vt.videoUrl
    ? vt.thumbnailSource === "CUSTOM"
      ? { label: "Custom thumbnail", sparkle: false }
      : vt.thumbnailSource === "CAPTURED"
      ? { label: "Captured frame", sparkle: false }
      : { label: "Auto thumbnail", sparkle: true }
    : null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <span className={`badge ${status.cls}`}>
        <Dot color={status.dot} />
        {status.label}
      </span>
      {thumbChip ? (
        <span className="badge badge-neutral" style={{ gap: 5 }}>
          {thumbChip.sparkle ? <SparkleGlyph /> : <Icon name="film" size={11} />}
          {thumbChip.label}
        </span>
      ) : null}
    </div>
  );
}
