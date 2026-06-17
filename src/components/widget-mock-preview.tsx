"use client";

// Faithful port of the WeHearYou "Widget Studio" preview renderer from the
// standalone design mock. Used to draw live style thumbnails on the widgets
// index. Reviews shown here are representative samples — the thumbnail is a
// preview of the widget's *appearance*, driven by each widget's real settings.

import React from "react";
import { Icon } from "@/components/icon";

const st = (s: React.CSSProperties): React.CSSProperties => s;

export type PreviewSettings = {
  type: "grid" | "carousel" | "single" | "badge" | "floating" | "cta";
  theme: "light" | "dark";
  accent: string;
  radius: number;
  device: "desktop" | "mobile";
  content: "reviews" | "videos" | "mixed";
  aiSummary: boolean;
  sources: Record<string, boolean>;
  minRating: number;
  maxReviews: number;
  showAvatars: boolean;
  showDates: boolean;
  showSources: boolean;
  showHeader: boolean;
  showBranding: boolean;
};

export const PREVIEW_DEFAULTS: PreviewSettings = {
  type: "grid",
  theme: "light",
  accent: "#4f46e5",
  radius: 12,
  device: "desktop",
  content: "mixed",
  aiSummary: true,
  sources: { Google: true, Facebook: true, Yelp: true, Trustpilot: true },
  minRating: 4,
  maxReviews: 6,
  showAvatars: true,
  showDates: true,
  showSources: true,
  showHeader: true,
  showBranding: true,
};

const SOURCE_META: Record<string, { color: string; letter: string }> = {
  WeHearYou: { color: "#4f46e5", letter: "W" },
  Google: { color: "var(--src-google)", letter: "G" },
  Facebook: { color: "var(--src-facebook)", letter: "f" },
  Yelp: { color: "var(--src-yelp)", letter: "Y" },
  Trustpilot: { color: "var(--src-trustpilot)", letter: "T" },
};

const AV_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

type Review = { id: number; name: string; rating: number; text: string; time: string; source: string };
type Video = { id: number; name: string; rating: number; quote: string; time: string; source: string; length: string };

const REVIEWS: Review[] = [
  { id: 1, name: "Sarah Johnson", rating: 5, text: "Absolutely the best experience I've had. The team was professional, kind, and thorough from start to finish.", time: "2 days ago", source: "Google" },
  { id: 2, name: "Michael Chen", rating: 5, text: "Booked online and was seen right away. Clean office, friendly staff, and zero pressure. Highly recommend.", time: "1 week ago", source: "Facebook" },
  { id: 3, name: "Priya Patel", rating: 4, text: "Great care and clear explanations. Wait was a little long but the quality made up for it.", time: "2 weeks ago", source: "Yelp" },
  { id: 4, name: "David Romero", rating: 5, text: "They genuinely care about their patients. I've already referred two friends here.", time: "3 weeks ago", source: "Google" },
  { id: 5, name: "Emily Carter", rating: 5, text: "From the front desk to the checkout, everything was seamless. I actually look forward to my visits now.", time: "1 month ago", source: "Trustpilot" },
  { id: 6, name: "James Wright", rating: 4, text: "Solid, dependable service every single time. Exactly what you want.", time: "1 month ago", source: "Facebook" },
];

const VIDEOS: Video[] = [
  { id: 1, name: "Olivia Bennett", rating: 5, quote: "I can't stop smiling — this changed everything for me.", time: "5 days ago", source: "Google", length: "0:42" },
  { id: 2, name: "Marcus Lee", rating: 5, quote: "Worth every minute. The results speak for themselves.", time: "2 weeks ago", source: "Yelp", length: "1:08" },
  { id: 3, name: "Hannah Kim", rating: 5, quote: "The most comfortable visit I've ever had. Truly.", time: "3 weeks ago", source: "Facebook", length: "0:55" },
];

const AI_SUMMARY = {
  count: 1284,
  text: "Customers consistently praise the friendly, professional staff and the clean, welcoming space. Many highlight short wait times, clear communication, and results that exceeded expectations.",
  highlights: ["Friendly staff", "Clean office", "Short waits", "Great results"],
};

const Stars = ({ value = 0, size = 14, gap = 1.5 }: { value?: number; size?: number; gap?: number }) => {
  const full = Math.floor(value);
  const frac = value - full;
  return (
    <span style={st({ display: "inline-flex", gap })}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = i < full ? 1 : i === full ? frac : 0;
        return (
          <span key={i} style={st({ position: "relative", width: size, height: size, display: "inline-block" })}>
            <svg viewBox="0 0 24 24" width={size} height={size} style={st({ position: "absolute", inset: 0 })}>
              <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="#e6e6ea" />
            </svg>
            <span style={st({ position: "absolute", inset: 0, width: `${fill * 100}%`, overflow: "hidden" })}>
              <svg viewBox="0 0 24 24" width={size} height={size} style={st({ display: "block" })}>
                <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="var(--star)" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
};

const Avatar = ({ name = "", size = 34 }: { name?: string; size?: number }) => {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const ci = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length;
  const c = AV_COLORS[ci];
  return (
    <span
      style={st({
        width: size, height: size, borderRadius: "50%", flex: "none",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: `color-mix(in srgb, ${c} 16%, #fff)`, color: c,
        fontSize: size * 0.36, fontWeight: 680, letterSpacing: "-.02em",
        border: `1px solid color-mix(in srgb, ${c} 22%, #fff)`,
      })}
    >
      {initials}
    </span>
  );
};

const wTokens = (s: PreviewSettings) =>
  s.theme === "dark"
    ? { bg: "#17171b", card: "#212126", line: "#2e2e35", text: "#f4f4f5", sub: "#a1a1aa", muted: "#71717a" }
    : { bg: "#ffffff", card: "#ffffff", line: "#e6e6ea", text: "#18181b", sub: "#52525b", muted: "#a1a1aa" };

type Tokens = ReturnType<typeof wTokens>;

const VerifiedTag = ({ s, tk }: { s: PreviewSettings; tk: Tokens }) =>
  s.showBranding ? (
    <div style={st({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: tk.muted })}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke={s.accent} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      Verified by WeHearYou
    </div>
  ) : null;

const SourceBadge = ({ source, size = 18 }: { source: string; size?: number }) => (
  <span
    style={st({
      width: size, height: size, borderRadius: size > 16 ? 5 : 4, flex: "none",
      background: (SOURCE_META[source] || {}).color, color: "#fff", display: "grid", placeItems: "center",
      fontSize: size * 0.58, fontWeight: 800, fontFamily: "var(--font-mono)",
    })}
  >
    {(SOURCE_META[source] || {}).letter}
  </span>
);

const ReviewCardW = ({ r, s, tk }: { r: Review; s: PreviewSettings; tk: Tokens }) => (
  <div style={st({ background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: 16, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 })}>
    <div style={st({ display: "flex", alignItems: "center", gap: 10 })}>
      {s.showAvatars && <Avatar name={r.name} size={34} />}
      <div style={st({ minWidth: 0, flex: 1 })}>
        <div style={st({ fontSize: 13.5, fontWeight: 620, color: tk.text })}>{r.name}</div>
        {s.showDates && <div style={st({ fontSize: 11.5, color: tk.muted })}>{r.time}</div>}
      </div>
      {s.showSources && <SourceBadge source={r.source} size={18} />}
    </div>
    <Stars value={r.rating} size={15} />
    <p style={st({ fontSize: 13, lineHeight: 1.55, color: tk.sub, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" })}>{r.text}</p>
  </div>
);

const VideoCardW = ({ v, s, tk }: { v: Video; s: PreviewSettings; tk: Tokens }) => (
  <div style={st({ background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 })}>
    <div style={st({ position: "relative", aspectRatio: "4 / 3", background: `linear-gradient(135deg, color-mix(in srgb, ${s.accent} 30%, #1b1b22), #0f0f14)` })}>
      <div style={st({ position: "absolute", inset: 0, display: "grid", placeItems: "center" })}>
        <span style={st({ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 6px 20px rgba(0,0,0,.3)" })}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill={s.accent} /></svg>
        </span>
      </div>
      <span style={st({ position: "absolute", bottom: 9, right: 9, background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 5 })}>{v.length}</span>
    </div>
    <div style={st({ padding: 14, display: "flex", flexDirection: "column", gap: 8 })}>
      <Stars value={v.rating} size={14} />
      <p style={st({ fontSize: 13, lineHeight: 1.5, color: tk.text, margin: 0, fontWeight: 500 })}>&ldquo;{v.quote}&rdquo;</p>
      <div style={st({ display: "flex", alignItems: "center", gap: 9, marginTop: 2 })}>
        {s.showAvatars && <Avatar name={v.name} size={28} />}
        <div style={st({ minWidth: 0, flex: 1 })}>
          <div style={st({ fontSize: 12.5, fontWeight: 620, color: tk.text })}>{v.name}</div>
          {s.showDates && <div style={st({ fontSize: 11, color: tk.muted })}>{v.time}</div>}
        </div>
        {s.showSources && <SourceBadge source={v.source} size={16} />}
      </div>
    </div>
  </div>
);

const AISummaryBox = ({ s, tk }: { s: PreviewSettings; tk: Tokens }) => {
  const dark = s.theme === "dark";
  return (
    <div style={st({ borderRadius: s.radius, padding: 16, marginBottom: 18, border: `1px solid color-mix(in srgb, ${s.accent} ${dark ? 40 : 26}%, ${tk.line})`, background: `color-mix(in srgb, ${s.accent} ${dark ? 16 : 8}%, ${tk.bg})` })}>
      <div style={st({ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 })}>
        <span style={st({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: s.accent, whiteSpace: "nowrap" })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.7 5L19 9.7 14 11l-2 5-2-5-5-1.3L10 8z" fill={s.accent} /></svg>
          AI Summary
        </span>
        <span style={st({ marginLeft: "auto", fontSize: 11, color: tk.muted, whiteSpace: "nowrap" })}>Based on {AI_SUMMARY.count} reviews</span>
      </div>
      <p style={st({ fontSize: 13, lineHeight: 1.6, color: tk.sub, margin: 0 })}>{AI_SUMMARY.text}</p>
      <div style={st({ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 })}>
        {AI_SUMMARY.highlights.map((h) => (
          <span key={h} style={st({ fontSize: 11.5, fontWeight: 540, padding: "3px 9px", borderRadius: 999, background: tk.card, border: `1px solid ${tk.line}`, color: tk.sub })}>{h}</span>
        ))}
      </div>
    </div>
  );
};

export function WidgetMockPreview({ settings }: { settings: Partial<PreviewSettings> }) {
  const s: PreviewSettings = { ...PREVIEW_DEFAULTS, ...settings };
  const tk = wTokens(s);
  const avg = 4.6;
  const total = "1,284";

  const Header = () =>
    s.showHeader ? (
      <div style={st({ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" })}>
        <div style={st({ display: "flex", alignItems: "baseline", gap: 8 })}>
          <span style={st({ fontSize: 34, fontWeight: 720, letterSpacing: "-.03em", color: tk.text, fontFamily: "var(--font-mono)" })}>{avg}</span>
          <Stars value={avg} size={18} />
        </div>
        <div style={st({ height: 30, width: 1, background: tk.line })} />
        <div style={st({ fontSize: 13, color: tk.sub })}>Based on <b style={st({ color: tk.text })}>{total}</b> verified reviews</div>
        <div style={st({ marginLeft: "auto" })}><VerifiedTag s={s} tk={tk} /></div>
      </div>
    ) : null;

  if (s.type === "floating") {
    return (
      <div style={st({ position: "absolute", right: 22, bottom: 22, display: "flex", alignItems: "center", gap: 11, background: tk.card, border: `1px solid ${tk.line}`, borderRadius: 999, padding: "9px 16px 9px 11px", boxShadow: "0 12px 30px -8px rgba(0,0,0,.28)" })}>
        <span style={st({ width: 34, height: 34, borderRadius: "50%", background: s.accent, display: "grid", placeItems: "center", flex: "none" })}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </span>
        <div style={st({ lineHeight: 1.25 })}>
          <div style={st({ display: "flex", alignItems: "center", gap: 6 })}>
            <span style={st({ fontSize: 15, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)" })}>{avg}</span>
            <Stars value={avg} size={13} />
          </div>
          <div style={st({ fontSize: 11, color: tk.muted })}>{total} reviews</div>
        </div>
      </div>
    );
  }

  if (s.type === "badge") {
    return (
      <div style={st({ display: "inline-flex", alignItems: "center", gap: 12, background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: "12px 18px", boxShadow: "var(--shadow-sm)" })}>
        <span style={st({ fontSize: 26, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)", letterSpacing: "-.02em" })}>{avg}</span>
        <div style={st({ lineHeight: 1.3 })}>
          <Stars value={avg} size={16} />
          <div style={st({ fontSize: 11.5, color: tk.muted, marginTop: 2 })}>{total} reviews · Excellent</div>
        </div>
        {s.showBranding && (<><div style={st({ width: 1, height: 30, background: tk.line })} /><VerifiedTag s={s} tk={tk} /></>)}
      </div>
    );
  }

  if (s.type === "cta") {
    return (
      <div style={st({ maxWidth: 460, margin: "0 auto", background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: 26, textAlign: "center" })}>
        <div style={st({ width: 50, height: 50, borderRadius: 14, margin: "0 auto 14px", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${s.accent} 14%, ${tk.bg})`, color: s.accent })}>
          <Icon name="chat" size={24} />
        </div>
        <h3 style={st({ fontSize: 19, fontWeight: 680, color: tk.text, letterSpacing: "-.02em" })}>How was your visit?</h3>
        <p style={st({ fontSize: 13.5, color: tk.sub, margin: "8px 0 18px", lineHeight: 1.5 })}>Your feedback helps others find great care. It only takes a minute.</p>
        <div style={st({ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" })}>
          {Object.keys(s.sources).filter((k) => s.sources[k]).map((src) => (
            <span key={src} style={st({ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${tk.line}`, background: tk.bg, color: tk.text, borderRadius: 8, padding: "9px 13px", fontSize: 13, fontWeight: 560 })}>
              <SourceBadge source={src} size={16} />{src}
            </span>
          ))}
        </div>
        <div style={st({ marginTop: 16 })}><VerifiedTag s={s} tk={tk} /></div>
      </div>
    );
  }

  if (s.type === "single") {
    const useVideo = s.content === "videos";
    const v = VIDEOS[0];
    const r = REVIEWS.find((x) => s.sources[x.source] && x.rating >= 5) || REVIEWS[0];
    return (
      <div style={st({ maxWidth: 540, margin: "0 auto" })}>
        {useVideo ? (
          <VideoCardW v={v} s={s} tk={tk} />
        ) : (
          <div style={st({ background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: 28, display: "flex", flexDirection: "column", gap: 16 })}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={st({ opacity: 0.25 })}><path d="M10 11H6a1 1 0 0 1-1-1V7a3 3 0 0 1 3-3M19 11h-4a1 1 0 0 1-1-1V7a3 3 0 0 1 3-3" stroke={s.accent} strokeWidth="2" /><path d="M10 11v3a4 4 0 0 1-4 4M19 11v3a4 4 0 0 1-4 4" stroke={s.accent} strokeWidth="2" /></svg>
            <p style={st({ fontSize: 18, lineHeight: 1.5, color: tk.text, margin: 0, fontWeight: 500, letterSpacing: "-.01em" })}>{r.text}</p>
            <Stars value={r.rating} size={18} />
            <div style={st({ display: "flex", alignItems: "center", gap: 11, borderTop: `1px solid ${tk.line}`, paddingTop: 16 })}>
              {s.showAvatars && <Avatar name={r.name} size={40} />}
              <div style={st({ flex: 1 })}>
                <div style={st({ fontSize: 14, fontWeight: 640, color: tk.text })}>{r.name}</div>
                {s.showDates && <div style={st({ fontSize: 12, color: tk.muted })}>{r.time} · {r.source} review</div>}
              </div>
              {s.showSources && <SourceBadge source={r.source} size={22} />}
            </div>
            {s.showBranding && <VerifiedTag s={s} tk={tk} />}
          </div>
        )}
      </div>
    );
  }

  // grid / carousel (Wall of Love)
  const reviews = REVIEWS.filter((r) => s.sources[r.source] && r.rating >= s.minRating);
  const videos = VIDEOS.filter((v) => s.sources[v.source]);
  let items: Array<{ kind: "review"; data: Review } | { kind: "video"; data: Video }>;
  if (s.content === "videos") items = videos.map((v) => ({ kind: "video" as const, data: v }));
  else if (s.content === "mixed") {
    const rs = reviews.map((r) => ({ kind: "review" as const, data: r }));
    const vs = videos.map((v) => ({ kind: "video" as const, data: v }));
    items = [];
    let ri = 0, vi = 0;
    while (ri < rs.length || vi < vs.length) {
      if (vi < vs.length) items.push(vs[vi++]);
      if (ri < rs.length) items.push(rs[ri++]);
      if (ri < rs.length) items.push(rs[ri++]);
    }
  } else items = reviews.map((r) => ({ kind: "review" as const, data: r }));
  items = items.slice(0, s.maxReviews);
  const showSummary = s.aiSummary && s.content !== "videos";

  return (
    <div>
      <Header />
      {showSummary && <AISummaryBox s={s} tk={tk} />}
      {s.type === "grid" ? (
        <div style={st({ columns: s.device === "mobile" ? "1" : "240px", columnGap: 14 })}>
          {items.map((it) => (
            <div key={it.kind + it.data.id} style={st({ breakInside: "avoid", marginBottom: 14 })}>
              {it.kind === "video" ? <VideoCardW v={it.data} s={s} tk={tk} /> : <ReviewCardW r={it.data} s={s} tk={tk} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={st({ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 })}>
          {items.map((it) => (
            <div key={it.kind + it.data.id} style={st({ width: 270, flex: "none" })}>
              {it.kind === "video" ? <VideoCardW v={it.data} s={s} tk={tk} /> : <ReviewCardW r={it.data} s={s} tk={tk} />}
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && <div style={st({ textAlign: "center", padding: 30, color: tk.muted, fontSize: 13 })}>No content matches these filters.</div>}
    </div>
  );
}

// Map a real ReviewWidget row onto the preview's settings vocabulary.
export function mapWidgetToPreviewSettings(w: {
  layout: string;
  theme: string;
  widgetType?: string | null;
  contentType: string;
  primaryColor?: string | null;
  minRating?: number | null;
  pageSize?: number | null;
  showHeader?: boolean | null;
  showDate?: boolean | null;
  showReviewerName?: boolean | null;
  showSourceLogo?: boolean | null;
}): Partial<PreviewSettings> {
  let type: PreviewSettings["type"] = "grid";
  if (w.widgetType === "BADGE" || w.layout === "badge") type = "badge";
  else if (w.widgetType === "FLOATING" || w.layout === "floating") type = "floating";
  else if (w.widgetType === "COLLECTING") type = "cta";
  else if (w.widgetType === "SINGLE_TESTIMONIAL") type = "single";
  else if (w.layout === "carousel" || w.layout === "slider" || w.layout === "video-carousel" || w.layout === "mixed-carousel") type = "carousel";
  else type = "grid";

  const content: PreviewSettings["content"] =
    w.contentType === "VIDEO" ? "videos" : w.contentType === "MIXED" ? "mixed" : "reviews";

  return {
    type,
    theme: w.theme === "dark" ? "dark" : "light",
    accent: w.primaryColor || "#4f46e5",
    content,
    minRating: w.minRating ?? 4,
    maxReviews: w.pageSize ?? 6,
    showHeader: w.showHeader ?? true,
    showDates: w.showDate ?? true,
    showAvatars: w.showReviewerName ?? true,
    showSources: w.showSourceLogo ?? true,
    aiSummary: false,
  };
}
