import { Icon } from "@/components/icon";

interface MessagePreviewProps {
  type: "review" | "video";
  channel: "sms" | "email";
  subject?: string;
  sms?: string;
  sample: string;
  location: string;
}

const DEFAULTS = {
  review: {
    subject: "How was your experience with {location}?",
    sms: "Hi {first}, thanks for visiting {location}! We'd love a quick review — it only takes 30 seconds: {link}",
    cta: "Leave a review",
  },
  video: {
    subject: "Share a quick video about {location}",
    sms: "Hi {first}! {location} would love a short video of your experience — no app needed, ~90s: {link}",
    cta: "Record my video",
  },
} as const;

function fillTokens(s: string, first: string, location: string) {
  return (s || "")
    .replaceAll("{first}", first)
    .replaceAll("{location}", location)
    .replaceAll("{link}", "wehr.yt/r/8f2a");
}

function BrandGlyph({ size }: { size: number }) {
  return (
    <svg width={Math.round(size * 0.53)} height={Math.round(size * 0.53)} viewBox="0 0 24 24" fill="none">
      <path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MessagePreview({ type, channel, subject, sms, sample, location }: MessagePreviewProps) {
  const def = DEFAULTS[type];
  const body = fillTokens(sms && sms.trim() ? sms : def.sms, sample, location);
  const subj = fillTokens(subject && subject.trim() ? subject : def.subject, sample, location);

  return (
    <div style={{ width: 268, margin: "0 auto", borderRadius: 34, background: "#0d0d12", padding: 8, boxShadow: "var(--shadow-pop)", flex: "none" }}>
      <div style={{ borderRadius: 27, background: "var(--page)", overflow: "hidden", position: "relative", height: 472, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 106, height: 22, background: "#0d0d12", borderRadius: "0 0 14px 14px", zIndex: 5 }} />

        {channel === "sms" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 30, background: "var(--ink-100)" }}>
            <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 9, background: "var(--white)", borderBottom: "1px solid var(--ink-200)" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}>
                <BrandGlyph size={30} />
              </span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 640 }}>{location}</div>
                <div style={{ fontSize: 10, color: "var(--ink-400)" }}>Text message · now</div>
              </div>
            </div>
            <div style={{ padding: 14, flex: 1 }}>
              <div style={{ background: "var(--white)", border: "1px solid var(--ink-200)", borderRadius: "4px 16px 16px 16px", padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-700)", boxShadow: "var(--shadow-xs)" }}>
                {body}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 30, background: "var(--white)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ink-150)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{location} via WeHearYou</div>
              <div style={{ fontSize: 13, fontWeight: 680, marginTop: 3, letterSpacing: "-.01em" }}>{subj}</div>
            </div>
            <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <BrandGlyph size={26} />
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{location}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.55, margin: 0 }}>Hi {sample},</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.55, margin: "9px 0 0" }}>
                Thanks for choosing {location}.{" "}
                {type === "video" ? "Would you share a short video about your experience?" : "Would you take a moment to share your experience? It really helps."}
              </p>
              {type === "review" ? (
                <div style={{ display: "flex", gap: 4, margin: "14px 0 4px" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <svg key={n} width="22" height="22" viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="var(--star)" /></svg>
                  ))}
                </div>
              ) : null}
              <div className="btn btn-primary" style={{ marginTop: "auto", justifyContent: "center", pointerEvents: "none" }}>
                <Icon name={type === "video" ? "film" : "star"} size={15} />{def.cta}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
