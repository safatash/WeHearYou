"use client";

// Faithful port of the WeHearYou "Widget Studio" preview renderer from the
// standalone design mock. Used to draw live style thumbnails on the widgets
// index. Reviews shown here are representative samples — the thumbnail is a
// preview of the widget's *appearance*, driven by each widget's real settings.

import React from "react";
import { Icon } from "@/components/icon";

const st = (s: React.CSSProperties): React.CSSProperties => s;

export type PreviewSettings = {
  type: "grid" | "carousel" | "single" | "badge" | "floating" | "collecting";
  theme: "light" | "dark";
  accent: string;
  radius: number;
  device: "desktop" | "mobile";
  content: "reviews" | "videos" | "mixed";
  aiSummary: boolean;
  aiSummaryText: string | null;
  aiSummaryCount: number | null;
  sources: Record<string, boolean>;
  minRating: number;
  maxReviews: number;
  marqueeSpeed: string;
  showAvatars: boolean;
  showDates: boolean;
  showSources: boolean;
  showHeader: boolean;
  showBranding: boolean;
  showRating: boolean;
  showAvgRating: boolean;
  showReviewCount: boolean;
  showWriteReview: boolean;
  showNav: boolean;
  showPagination: boolean;
  showResponses: boolean;
  starColor: string;
  starColorMode: "gold" | "accent" | "ink";
  fontFamily: string;
  cardStyle: "border" | "shadow" | "soft";
  density: "cozy" | "compact";
  gridColumns: string;
  wallStyle: "varied" | "uniform";
  cardHeights: "equal" | "natural";
  fontSizeBase: number;
  fontSizeNames: number;
  fontSizeHeader: number;
  fontSizeLabel: number;
  fontSizeSummary: number;
  bodyMaxChars: number;
  // Badge
  badgeStyle: "rating" | "compact" | "review_cta" | "trust";
  // Collecting
  collectPosition: "bottom-right" | "bottom-left" | "right" | "left";
  collectTheme: "default" | "minimal" | "branded";
  collectColor: string | null;
  // Floating
  floatingCardStyle: "dark_solid_pill" | "frosted_glass_pill" | "notification_compact" | "below_card";
  floatingVariation: "compact" | "standard" | "rich";
  floatingPosition: "bottom-right" | "bottom-left" | "right" | "left";
  floatingAccentColor: string;
  floatingMinRating: number;
};

export const PREVIEW_DEFAULTS: PreviewSettings = {
  type: "grid",
  theme: "light",
  accent: "#4f46e5",
  radius: 12,
  device: "desktop",
  content: "mixed",
  aiSummary: true,
  aiSummaryText: null,
  aiSummaryCount: null,
  sources: { Google: true, Facebook: true, Yelp: true, Trustpilot: true },
  minRating: 4,
  maxReviews: 6,
  marqueeSpeed: "normal",
  showAvatars: true,
  showDates: true,
  showSources: true,
  showHeader: true,
  showBranding: true,
  showRating: true,
  showAvgRating: true,
  showReviewCount: true,
  showWriteReview: true,
  showNav: true,
  showPagination: true,
  showResponses: false,
  starColor: "#fbbf24",
  starColorMode: "gold",
  fontFamily: "system",
  cardStyle: "border",
  density: "cozy",
  gridColumns: "auto",
  wallStyle: "varied",
  cardHeights: "equal",
  fontSizeBase: 14,
  fontSizeNames: 13,
  fontSizeHeader: 20,
  fontSizeLabel: 12,
  fontSizeSummary: 14,
  bodyMaxChars: 280,
  badgeStyle: "rating",
  collectPosition: "bottom-right",
  collectTheme: "default",
  collectColor: null,
  floatingCardStyle: "dark_solid_pill",
  floatingVariation: "standard",
  floatingPosition: "bottom-right",
  floatingAccentColor: "#4f46e5",
  floatingMinRating: 4,
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


const Stars = ({ value = 0, size = 14, gap = 1.5, color }: { value?: number; size?: number; gap?: number; color?: string }) => {
  const full = Math.floor(value);
  const frac = value - full;
  const starFill = color || "var(--star)";
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
                <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill={starFill} />
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

const FONT_STACKS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  sans: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  serif: "'Georgia', 'Times New Roman', serif",
  round: "'Nunito', 'Varela Round', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};

// Instrument Serif is used for review body text in the "varied" wall layout
// to give the editorial testimonial feel seen in the mockup.
const INSTRUMENT_SERIF = "'Instrument Serif', 'Georgia', serif";

function resolveStarColor(s: PreviewSettings): string {
  if (s.starColorMode === "accent") return s.accent;
  if (s.starColorMode === "ink") return s.theme === "dark" ? "#f4f4f5" : "#18181b";
  return s.starColor || "#fbbf24"; // gold
}

function resolveCardStyle(s: PreviewSettings, tk: { bg: string; card: string; line: string }) {
  if (s.cardStyle === "shadow") return { background: tk.card, border: "1px solid transparent", boxShadow: s.theme === "dark" ? "0 4px 16px rgba(0,0,0,.45)" : "0 2px 12px rgba(0,0,0,.10)" };
  if (s.cardStyle === "soft") return { background: s.theme === "dark" ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)", border: "1px solid transparent" };
  return { background: tk.card, border: `1px solid ${tk.line}` }; // border (default)
}

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

// FeaturedReviewCardW: accent-coloured card used for wallStyle="varied" featured slot
const FeaturedReviewCardW = ({ r, s, tk }: { r: Review; s: PreviewSettings; tk: Tokens }) => {
  const starColor = "rgba(255,255,255,0.9)";
  const fontStack = FONT_STACKS[s.fontFamily] || FONT_STACKS.system;
  const pad = s.density === "compact" ? 16 : 22;
  return (
    <div style={st({ background: s.accent, borderRadius: s.radius, padding: pad, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, fontFamily: fontStack, color: "#fff" })}>
      {s.showRating && <Stars value={r.rating} size={s.density === "compact" ? 15 : 18} color={starColor} />}
      <p style={st({ fontSize: (s.fontSizeBase || 14) + 4, lineHeight: 1.45, color: "#fff", margin: 0, fontWeight: 400, letterSpacing: "-.01em", fontFamily: INSTRUMENT_SERIF })}>&#8220;{r.text}&#8221;</p>
      {s.showAvatars && (
        <div style={st({ display: "flex", alignItems: "center", gap: 9, marginTop: 4 })}>
          <Avatar name={r.name} size={32} />
          <div>
            <div style={st({ fontSize: s.fontSizeNames || 13, fontWeight: 640, color: "#fff" })}>{r.name}</div>
            {s.showDates && <div style={st({ fontSize: s.fontSizeLabel || 11, color: "rgba(255,255,255,.7)" })}>{r.time}</div>}
          </div>
          {s.showSources && <span style={st({ marginLeft: "auto" })}><SourceBadge source={r.source} size={18} /></span>}
        </div>
      )}
    </div>
  );
};

const ReviewCardW = ({ r, s, tk, featured, accentFont }: { r: Review; s: PreviewSettings; tk: Tokens; featured?: boolean; accentFont?: boolean }) => {
  if (featured && s.wallStyle === "varied") return <FeaturedReviewCardW r={r} s={s} tk={tk} />;
  const cardStyles = resolveCardStyle(s, tk);
  const starColor = resolveStarColor(s);
  const fontStack = FONT_STACKS[s.fontFamily] || FONT_STACKS.system;
  // In varied layout, only accent-font cards (roughly 1 in 3) use Instrument Serif
  const bodyFont = (s.wallStyle === "varied" && accentFont) ? INSTRUMENT_SERIF : fontStack;
  const pad = s.density === "compact" ? 12 : 16;
  const truncLen = s.bodyMaxChars || 280;
  const bodyText = r.text.length > truncLen ? r.text.slice(0, truncLen) + "…" : r.text;
  // Fake owner response for preview
  const ownerReply = "Thank you so much for your kind words! We really appreciate you taking the time to share your experience.";
  return (
    <div style={st({ ...cardStyles, borderRadius: s.radius, padding: pad, display: "flex", flexDirection: "column", gap: s.density === "compact" ? 7 : 9, minWidth: 0, fontFamily: fontStack })}>
      {s.showAvatars && (
        <div style={st({ display: "flex", alignItems: "center", gap: 10 })}>
          <Avatar name={r.name} size={s.density === "compact" ? 28 : 34} />
          <div style={st({ minWidth: 0, flex: 1 })}>
            <div style={st({ fontSize: s.fontSizeNames || 13.5, fontWeight: 620, color: tk.text })}>{r.name}</div>
            {s.showDates && <div style={st({ fontSize: s.fontSizeLabel || 11.5, color: tk.muted })}>{r.time}</div>}
          </div>
          {s.showSources && <SourceBadge source={r.source} size={18} />}
        </div>
      )}
      {!s.showAvatars && s.showSources && (
        <div style={st({ display: "flex", justifyContent: "flex-end" })}>
          <SourceBadge source={r.source} size={18} />
        </div>
      )}
      {s.showRating && <Stars value={r.rating} size={s.density === "compact" ? 13 : 15} color={starColor} />}
      <p style={st({ fontSize: s.fontSizeBase || 13, lineHeight: 1.6, color: tk.sub, margin: 0, fontFamily: bodyFont })}>&#8220;{bodyText}&#8221;</p>
      {s.showResponses && (
        <div style={st({ background: `color-mix(in srgb, ${s.accent} 8%, ${tk.bg})`, border: `1px solid color-mix(in srgb, ${s.accent} 20%, ${tk.line})`, borderRadius: Math.max(4, s.radius - 4), padding: "9px 11px", fontSize: (s.fontSizeBase || 13) - 1, color: tk.sub, lineHeight: 1.5 })}>
          <span style={st({ fontWeight: 640, color: s.accent, fontSize: (s.fontSizeBase || 13) - 1 })}>Owner reply: </span>{ownerReply}
        </div>
      )}
    </div>
  );
};

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
  const text = s.aiSummaryText;
  // No real summary → render nothing (no empty placeholder), matching the embed.
  if (!text || !text.trim()) return null;
  const chips = ["Highly rated", "Recommended", "Verified reviews"];
  return (
    <div style={st({ borderRadius: s.radius, padding: 16, marginBottom: 18, border: `1px solid color-mix(in srgb, ${s.accent} ${dark ? 40 : 26}%, ${tk.line})`, background: `color-mix(in srgb, ${s.accent} ${dark ? 16 : 8}%, ${tk.bg})` })}>
      <div style={st({ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 })}>
        <span style={st({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: s.accent, whiteSpace: "nowrap" })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.7 5L19 9.7 14 11l-2 5-2-5-5-1.3L10 8z" fill={s.accent} /></svg>
          AI Summary
        </span>
        {s.aiSummaryCount ? (
          <span style={st({ marginLeft: "auto", fontSize: 11, color: tk.muted, whiteSpace: "nowrap" })}>Based on {s.aiSummaryCount} reviews</span>
        ) : null}
      </div>
      <p style={st({ fontSize: s.fontSizeSummary || 13, lineHeight: 1.6, color: tk.sub, margin: 0 })}>{text}</p>
      <div style={st({ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 })}>
        {chips.map((h) => (
          <span key={h} style={st({ fontSize: 11.5, fontWeight: 540, padding: "3px 9px", borderRadius: 999, background: tk.card, border: `1px solid ${tk.line}`, color: tk.sub })}>{h}</span>
        ))}
      </div>
    </div>
  );
};

// Split items into two staggered rows, cycling so each row stays comfortably
// full for a seamless auto-scrolling marquee.
function buildMarqueeRows<T>(pool: T[]): [T[], T[]] {
  if (pool.length === 0) return [[], []];
  const filled: T[] = [];
  while (filled.length < Math.max(6, pool.length)) filled.push(...pool);
  const half = Math.ceil(filled.length / 2);
  const rowB = filled.slice(half).concat(filled.slice(0, Math.max(0, half - (filled.length - half))));
  return [filled.slice(0, half), rowB.length ? rowB : filled.slice(0, half)];
}

// Corner placement for floating / collecting overlays within the preview frame.
function cornerStyle(pos: string): React.CSSProperties {
  switch (pos) {
    case "bottom-left": return { left: 18, bottom: 18 };
    case "right": return { right: 0, top: "50%", transform: "translateY(-50%)" };
    case "left": return { left: 0, top: "50%", transform: "translateY(-50%)" };
    default: return { right: 18, bottom: 18 };
  }
}

function Header({ s, tk, avg, total }: { s: PreviewSettings; tk: ReturnType<typeof wTokens>; avg: number; total: string }) {
  const starColor = resolveStarColor(s);
  const fontStack = FONT_STACKS[s.fontFamily] || FONT_STACKS.system;
  if (!s.showHeader) return null;
  const showAvg = s.showAvgRating !== false;
  const showCount = s.showReviewCount !== false;
  if (!showAvg && !showCount) return null;
  return (
    <div style={st({ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap", fontFamily: fontStack })}>
      {showAvg && (
        <div style={st({ display: "flex", alignItems: "baseline", gap: 8 })}>
          <span style={st({ fontSize: s.fontSizeHeader || 34, fontWeight: 720, letterSpacing: "-.03em", color: tk.text })}>{avg}</span>
          <Stars value={avg} size={18} color={starColor} />
        </div>
      )}
      {showAvg && showCount && <div style={st({ height: 30, width: 1, background: tk.line })} />}
      {showCount && <div style={st({ fontSize: s.fontSizeLabel || 13, color: tk.sub })}>Based on <b style={st({ color: tk.text })}>{total}</b> verified reviews</div>}
      <div style={st({ marginLeft: "auto" })}><VerifiedTag s={s} tk={tk} /></div>
    </div>
  );
}

type RealReview = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  rating: number;
  body: string;
  reviewedAt: string | null;
  source: string;
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return dateStr.split("T")[0];
}

function convertRealReviews(realReviews: RealReview[]): Review[] {
  return realReviews.map((r) => {
    const sourceMap: Record<string, string> = {
      GOOGLE: "Google",
      FACEBOOK: "Facebook",
      YELP: "Yelp",
      INTERNAL: "WeHearYou",
      WEHEARYOU: "WeHearYou",
    };
    return {
      id: parseInt(r.id, 10) || Math.random() * 1000000,
      name: r.reviewerName || "Anonymous",
      rating: r.rating,
      text: r.body,
      time: formatRelativeTime(r.reviewedAt),
      source: sourceMap[r.source] || r.source,
    };
  });
}

export function WidgetMockPreview({
  settings,
  realReviews,
  locationStats,
}: {
  settings: Partial<PreviewSettings>;
  realReviews?: RealReview[];
  locationStats?: { avgRating: number | null; reviewCount: number };
}) {
  const s: PreviewSettings = { ...PREVIEW_DEFAULTS, ...settings };
  const tk = wTokens(s);

  // Use real data if available, otherwise use defaults
  const reviews = realReviews && realReviews.length > 0 ? convertRealReviews(realReviews) : REVIEWS;
  const avgRating = locationStats?.avgRating ?? 4.6;
  const avg = parseFloat(avgRating.toFixed(1));
  const total = locationStats?.reviewCount ? locationStats.reviewCount.toLocaleString() : "1,284";

  if (s.type === "floating") {
    const r = reviews.find((x) => x.rating >= s.floatingMinRating) || reviews[0];
    const accent = s.floatingAccentColor || s.accent;
    const compact = s.floatingVariation === "compact";
    const quote = r.text.length > (compact ? 60 : 110) ? r.text.slice(0, compact ? 60 : 110) + "…" : r.text;
    const source = r.source === "Google" ? "On Google" : "On " + r.source;
    const cardBase: React.CSSProperties = { background: "#fff", borderRadius: 14, boxShadow: "0 6px 20px rgba(0,0,0,.16)", padding: "12px 14px", border: "1px solid rgba(0,0,0,.06)", width: s.floatingVariation === "rich" ? 270 : 240 };
    const avatar = <span style={st({ width: 30, height: 30, borderRadius: "50%", background: accent, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flex: "none" })}>{r.name[0]}</span>;

    let card: React.ReactNode;
    if (s.floatingCardStyle === "notification_compact") {
      card = (
        <div style={st(cardBase)}>
          <div style={st({ display: "flex", alignItems: "center", gap: 8 })}>
            {avatar}
            <div>
              <div style={st({ fontSize: 12, fontWeight: 700, color: "#0f172a" })}>{r.name}</div>
              <div style={st({ fontSize: 11, color: "#64748b" })}>just left a {r.rating}-star review</div>
              <div style={st({ display: "flex", alignItems: "center", gap: 6, marginTop: 2 })}><Stars value={r.rating} size={11} /><span style={st({ fontSize: 10, color: "#64748b", fontWeight: 500 })}>{source}</span></div>
            </div>
          </div>
        </div>
      );
    } else if (s.floatingCardStyle === "below_card") {
      card = (
        <div style={st(cardBase)}>
          <Stars value={r.rating} size={13} />
          {!compact && <p style={st({ fontSize: 11, color: "#475569", lineHeight: 1.5, paddingLeft: 7, margin: "7px 0", borderLeft: `2px solid ${accent}` })}>{quote}</p>}
          <div style={st({ display: "flex", alignItems: "center", gap: 7, marginTop: 7 })}>{avatar}<div><div style={st({ fontSize: 11, fontWeight: 700, color: "#0f172a" })}>{r.name}</div><div style={st({ fontSize: 9, color: "#64748b" })}>{source}</div></div></div>
        </div>
      );
    } else {
      const pillBg = s.floatingCardStyle === "frosted_glass_pill" ? "rgba(15,23,42,.65)" : "#0f172a";
      card = (
        <div style={st(cardBase)}>
          <Stars value={r.rating} size={13} />
          {!compact && <p style={st({ fontSize: 11, color: "#475569", lineHeight: 1.5, paddingLeft: 7, margin: "7px 0", borderLeft: `2px solid ${accent}` })}>{quote}</p>}
          <div style={st({ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "4px 10px 4px 4px", background: pillBg, marginTop: 7, backdropFilter: s.floatingCardStyle === "frosted_glass_pill" ? "blur(4px)" : undefined })}>
            {avatar}
            <div><div style={st({ fontSize: 11, fontWeight: 700, color: "#fff" })}>{r.name}</div><div style={st({ fontSize: 9, color: "rgba(255,255,255,.7)" })}>{source}</div></div>
          </div>
        </div>
      );
    }
    return <div style={st({ position: "absolute", zIndex: 5, maxWidth: 280, ...cornerStyle(s.floatingPosition) })}>{card}</div>;
  }

  if (s.type === "badge") {
    if (s.badgeStyle === "compact") {
      return (
        <span style={st({ display: "inline-flex", alignItems: "center", gap: 8, background: tk.card, border: `1px solid ${tk.line}`, borderRadius: 999, padding: "6px 13px", boxShadow: "var(--shadow-sm)" })}>
          <span style={st({ fontSize: 15, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)" })}>{avg}</span>
          <Stars value={avg} size={13} />
          <span style={st({ fontSize: 11.5, color: tk.muted })}>({total})</span>
        </span>
      );
    }
    if (s.badgeStyle === "review_cta") {
      return (
        <div style={st({ display: "inline-flex", flexDirection: "column", gap: 12, background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: "16px 20px", boxShadow: "var(--shadow-sm)", textAlign: "center", alignItems: "center" })}>
          <div style={st({ display: "flex", alignItems: "center", gap: 10 })}>
            <span style={st({ fontSize: 24, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)" })}>{avg}</span>
            <div><Stars value={avg} size={15} /><div style={st({ fontSize: 11, color: tk.muted, marginTop: 2 })}>{total} reviews</div></div>
          </div>
          <button style={st({ border: 0, cursor: "pointer", background: s.accent, color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600 })}>Write a review</button>
        </div>
      );
    }
    if (s.badgeStyle === "trust") {
      return (
        <div style={st({ display: "inline-flex", alignItems: "center", gap: 13, background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: "11px 18px", boxShadow: "var(--shadow-sm)" })}>
          <span style={st({ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${s.accent} 14%, ${tk.bg})`, color: s.accent })}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" stroke={s.accent} strokeWidth="2" strokeLinejoin="round" /></svg>
          </span>
          <div style={st({ width: 1, height: 26, background: tk.line })} />
          <span style={st({ fontSize: 20, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)" })}>{avg}</span>
          <Stars value={avg} size={15} />
          <span style={st({ fontSize: 12, color: tk.muted, whiteSpace: "nowrap" })}>{total} reviews · Excellent</span>
        </div>
      );
    }
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

  if (s.type === "collecting") {
    const color = s.collectColor || s.accent;
    const isTab = s.collectPosition === "right" || s.collectPosition === "left";
    const themed: React.CSSProperties =
      s.collectTheme === "minimal"
        ? { background: "#fff", color, border: `2px solid ${color}` }
        : { background: color, color: "#fff", border: "none" };
    const tabRadius = s.collectPosition === "right" ? "10px 0 0 10px" : "0 10px 10px 0";
    return (
      <div style={st({ position: "absolute", zIndex: 5, ...cornerStyle(s.collectPosition) })}>
        <button
          style={st({
            ...themed,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 6px 18px rgba(0,0,0,.18)",
            padding: isTab ? "14px 9px" : "11px 17px",
            borderRadius: isTab ? tabRadius : 999,
            writingMode: isTab ? "vertical-rl" : undefined,
            transform: s.collectPosition === "left" ? "rotate(180deg)" : undefined,
          })}
        >
          {!isTab && <Icon name="chat" size={15} />}
          Share Feedback
          {s.collectTheme === "branded" && !isTab && (
            <span style={st({ fontSize: 9, fontWeight: 700, opacity: 0.75, borderLeft: "1px solid rgba(255,255,255,.4)", paddingLeft: 6 })}>WeHearYou</span>
          )}
        </button>
      </div>
    );
  }

  if (s.type === "single") {
    const useVideo = s.content === "videos";
    const v = VIDEOS[0];
    const r = reviews.find((x) => s.sources[x.source] && x.rating >= 5) || reviews[0];
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
  // Build a set of enabled sources from the gridColumns/wallStyle settings
  // The `sources` field in PreviewSettings is a legacy Record<string,bool> — we also
  // support the new string-based `enabledSources` CSV passed via previewSettings.
  const enabledSourcesSet: Set<string> = (() => {
    // Check if any source in the sources record is explicitly false
    const hasExplicitFalse = Object.values(s.sources).some((v) => v === false);
    if (!hasExplicitFalse) return new Set(["Google", "Facebook", "Yelp", "WeHearYou", "Trustpilot", "INTERNAL"]);
    return new Set(Object.entries(s.sources).filter(([, v]) => v).map(([k]) => k));
  })();
  const filteredReviews = reviews.filter((r) => enabledSourcesSet.has(r.source) && r.rating >= s.minRating);
  const videos = VIDEOS.filter((v) => enabledSourcesSet.has(v.source));
  let items: Array<{ kind: "review"; data: Review } | { kind: "video"; data: Video }>;
  if (s.content === "videos") items = videos.map((v) => ({ kind: "video" as const, data: v }));
  else if (s.content === "mixed") {
    const rs = filteredReviews.map((r) => ({ kind: "review" as const, data: r }));
    const vs = videos.map((v) => ({ kind: "video" as const, data: v }));
    items = [];
    let ri = 0, vi = 0;
    while (ri < rs.length || vi < vs.length) {
      if (vi < vs.length) items.push(vs[vi++]);
      if (ri < rs.length) items.push(rs[ri++]);
      if (ri < rs.length) items.push(rs[ri++]);
    }
  } else items = filteredReviews.map((r) => ({ kind: "review" as const, data: r }));
  const marqueeRows = buildMarqueeRows(items);
  const marqueeDur = s.marqueeSpeed === "slow" ? 60 : s.marqueeSpeed === "fast" ? 26 : 40;
  items = items.slice(0, s.maxReviews);
  const showSummary = s.aiSummary && s.content !== "videos";

  return (
    <div>
      <Header s={s} tk={tk} avg={avg} total={total} />
      {showSummary && <AISummaryBox s={s} tk={tk} />}
      {s.type === "grid" ? (
        (() => {
          const gap = s.density === "compact" ? 10 : 14;
          // For varied layout, pick the highest-rated review as the featured card
          const featuredIdx = s.wallStyle === "varied" ? items.findIndex((it) => it.kind === "review") : -1;
          // In varied layout, every 3rd non-featured review card gets Instrument Serif (accent font)
          // Track non-featured review count to assign accent font to ~1 in 3
          let nonFeaturedReviewCount = 0;
          // Determine column layout
          let gridStyle: React.CSSProperties;
          if (s.device === "mobile") {
            gridStyle = { columns: "1", columnGap: gap };
          } else if (s.cardHeights === "natural") {
            // Natural masonry: always use CSS columns regardless of gridColumns setting
            const colCount = s.gridColumns === "3" ? 3 : s.gridColumns === "2" ? 2 : 2;
            gridStyle = { columns: colCount, columnGap: gap };
          } else if (s.gridColumns === "2") {
            gridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap };
          } else if (s.gridColumns === "3") {
            gridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap };
          } else {
            // auto = masonry-style columns
            gridStyle = { columns: "240px", columnGap: gap };
          }
          // cardHeights: "equal" = all cards same height; "natural" = masonry heights
          const isNatural = s.cardHeights === "natural";
          const uniformHeight = !isNatural ? 180 : undefined;
          const cardWrap: React.CSSProperties = (s.gridColumns !== "auto" && !isNatural)
            ? { display: "contents" }
            : { breakInside: "avoid", marginBottom: gap };
          return (
            <div style={st(gridStyle)}>
              {items.map((it, idx) => {
                let accentFont = false;
                if (it.kind === "review" && idx !== featuredIdx && s.wallStyle === "varied") {
                  nonFeaturedReviewCount++;
                  // Every 3rd non-featured review card gets Instrument Serif
                  accentFont = nonFeaturedReviewCount % 3 === 0;
                }
                return (
                  <div key={it.kind + it.data.id} style={st({ ...cardWrap, ...(uniformHeight && s.gridColumns !== "auto" ? { height: uniformHeight, overflow: "hidden" } : {}) })}>
                    {it.kind === "video" ? <VideoCardW v={it.data} s={s} tk={tk} /> : <ReviewCardW r={it.data} s={s} tk={tk} featured={idx === featuredIdx} accentFont={accentFont} />}
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        <div style={st({ display: "flex", flexDirection: "column", gap: 14 })}>
          {([["l", marqueeRows[0]], ["r", marqueeRows[1]]] as Array<["l" | "r", typeof items]>).map(([dir, row], idx) =>
            row.length ? (
              <div key={dir} className="why-marq">
                <div className={`why-marq-track why-marq-track--${dir}`} style={st({ gap: 14, animationDuration: `${idx === 0 ? marqueeDur : Math.round(marqueeDur * 1.22)}s` })}>
                  {[...row, ...row].map((it, i) => (
                    <div key={it.kind + it.data.id + "-" + i} style={st({ width: s.device === "mobile" ? 250 : 300, flex: "none" })}>
                      {it.kind === "video" ? <VideoCardW v={it.data} s={s} tk={tk} /> : <ReviewCardW r={it.data} s={s} tk={tk} />}
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
          {/* Nav arrows for carousel */}
          {s.showNav && (
            <div style={st({ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 })}>
              {["‹", "›"].map((arrow) => (
                <button key={arrow} style={st({ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${tk.line}`, background: tk.card, color: tk.text, fontSize: 18, cursor: "default", display: "grid", placeItems: "center" })}>{arrow}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Write a review link */}
      {s.showWriteReview && s.type === "grid" && (
        <div style={st({ marginTop: 14, textAlign: "center" })}>
          <a style={st({ fontSize: 13, color: s.accent, fontWeight: 580, textDecoration: "none", cursor: "default" })}>+ Write a review</a>
        </div>
      )}
      {/* Pagination / load more */}
      {s.showPagination && s.type === "grid" && (
        <div style={st({ marginTop: 14, display: "flex", justifyContent: "center" })}>
          <button style={st({ padding: "8px 22px", borderRadius: s.radius, border: `1px solid ${tk.line}`, background: tk.card, color: tk.sub, fontSize: 13, cursor: "default", fontWeight: 560 })}>Load more reviews</button>
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
  marqueeSpeed?: string | null;
  showHeader?: boolean | null;
  showDate?: boolean | null;
  showReviewerName?: boolean | null;
  showSourceLogo?: boolean | null;
}): Partial<PreviewSettings> {
  let type: PreviewSettings["type"] = "grid";
  if (w.widgetType === "BADGE" || w.layout === "badge") type = "badge";
  else if (w.widgetType === "FLOATING" || w.layout === "floating") type = "floating";
  else if (w.widgetType === "COLLECTING") type = "collecting";
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
    marqueeSpeed: w.marqueeSpeed ?? "normal",
    showHeader: w.showHeader ?? true,
    showDates: w.showDate ?? true,
    showAvatars: w.showReviewerName ?? true,
    showSources: w.showSourceLogo ?? true,
    aiSummary: false,
  };
}
