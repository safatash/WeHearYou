"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Icon, type IconName } from "@/components/icon";
import { WidgetMockPreview, type PreviewSettings } from "@/components/widget-mock-preview";
import { updateReviewWidget, getOrCreateWidgetForLocation } from "@/app/widgets/actions";

const st = (s: React.CSSProperties): React.CSSProperties => s;

const PAGE_SIZE_OPTIONS = [2, 4, 6, 8, 10, 12, 16];
const ACCENTS = ["#4f46e5", "#2563eb", "#0e9488", "#7c3aed", "#e0533d", "#18181b"];

type TypeKey = "grid" | "carousel" | "single" | "badge" | "collecting" | "floating";

const STUDIO_TYPES: Array<{ id: TypeKey; label: string; icon: IconName; desc: string }> = [
  { id: "grid", label: "Wall of Love", icon: "grid", desc: "Masonry of reviews" },
  { id: "carousel", label: "Review marquee", icon: "layers", desc: "Auto-scrolling rows of reviews" },
  { id: "single", label: "Single testimonial", icon: "film", desc: "One standout quote" },
  { id: "badge", label: "Rating badge", icon: "star", desc: "Compact score + stars" },
  { id: "collecting", label: "Collect reviews", icon: "send", desc: "Floating feedback button" },
  { id: "floating", label: "Floating badge", icon: "chat", desc: "Sticky social-proof card" },
];

type ContentKey = "reviews" | "videos" | "mixed";
type BadgeStyle = "rating" | "compact" | "review_cta" | "trust";

// What each type maps to in the real schema. The embed keys video/mixed off
// contentType (not the layout name), so layout stays masonry/carousel/grid/badge.
const TYPE_TO_FIELDS: Record<TypeKey, { widgetType: string; layout: string }> = {
  grid: { widgetType: "WALL_OF_LOVE", layout: "masonry" },
  carousel: { widgetType: "WALL_OF_LOVE", layout: "carousel" },
  single: { widgetType: "SINGLE_TESTIMONIAL", layout: "grid" },
  badge: { widgetType: "BADGE", layout: "badge" },
  collecting: { widgetType: "COLLECTING", layout: "grid" },
  floating: { widgetType: "FLOATING", layout: "floating" },
};

function deriveContent(contentType: string): ContentKey {
  if (contentType === "VIDEO") return "videos";
  if (contentType === "MIXED") return "mixed";
  return "reviews";
}

function resolveContentType(typeKey: TypeKey, content: ContentKey): string {
  if (typeKey === "badge" || typeKey === "collecting" || typeKey === "floating") return "TEXT";
  if (typeKey === "single") return content === "videos" ? "VIDEO" : "TEXT";
  return content === "videos" ? "VIDEO" : content === "mixed" ? "MIXED" : "TEXT";
}

export type StudioWidget = {
  id: string;
  publicToken: string;
  name: string;
  organizationId: string;
  locationId: string;
  layout: string;
  contentType: string;
  widgetType: string | null;
  theme: string;
  minRating: number;
  pageSize: number;
  isActive: boolean;
  showHeader: boolean;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showWriteReview: boolean;
  showSourceLogo: boolean;
  primaryColor: string;
  starColor: string;
  showAiSummary: boolean;
  marqueeSpeed: string;
  badgeStyle: string | null;
  // Collecting
  collectButtonPosition: string | null;
  collectButtonTheme: string | null;
  collectButtonColor: string | null;
  collectMobileBehavior: string | null;
  // Floating
  floatingCardStyle: string | null;
  floatingVariation: string | null;
  floatingPosition: string | null;
  floatingRotationEnabled: boolean | null;
  floatingRotationIntervalSec: number | null;
  floatingAccentColorMode: string | null;
  floatingAccentColor: string | null;
  floatingMobileBehavior: string | null;
  floatingApprovedOnly: boolean | null;
  floatingMinRating: number | null;
  // now exposed in editor
  showAvgRating: boolean;
  showReviewCount: boolean;
  showResponses: boolean;
  showNav: boolean;
  showPagination: boolean;
  showBranding: boolean;
  fontSizeBase: number;
  fontSizeNames: number;
  fontSizeHeader: number;
  fontSizeLabel: number;
  fontSizeSummary: number;
  bodyMaxChars: number;
  // Appearance & style
  fontFamily: string;
  starColorMode: string;
  cornerRadius: number;
  cardStyle: string;
  density: string;
  gridColumns: string;
  wallStyle: string;
  enabledSources: string;
  // preserved-as-is fields (not exposed in this editor)
  sort: string;
  headerAlign: string;
  backgroundColor: string;
  textColor: string;
};

function deriveTypeKey(w: StudioWidget): TypeKey {
  if (w.widgetType === "FLOATING" || w.layout === "floating") return "floating";
  if (w.widgetType === "COLLECTING") return "collecting";
  if (w.widgetType === "BADGE" || w.layout === "badge") return "badge";
  if (w.widgetType === "SINGLE_TESTIMONIAL") return "single";
  if (w.layout === "carousel" || w.layout === "slider") return "carousel";
  return "grid";
}

function snapPageSize(n: number): number {
  return PAGE_SIZE_OPTIONS.reduce((best, opt) => (Math.abs(opt - n) < Math.abs(best - n) ? opt : best), PAGE_SIZE_OPTIONS[0]);
}

/* ── control primitives (ported from the mock) ───────────────────────────── */
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={st({ display: "flex", flexDirection: "column", gap: 8 })}>
    <div style={st({ display: "flex", alignItems: "baseline", justifyContent: "space-between" })}>
      <span style={st({ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" })}>{label}</span>
      {hint && <span style={st({ fontSize: 11.5, color: "var(--ink-400)" })}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Segmented = <T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string; icon?: IconName }>; onChange: (v: T) => void }) => (
  <div style={st({ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" })}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={st({ flex: 1, border: 0, cursor: "pointer", padding: "6px 8px", borderRadius: 5, fontSize: 12.5, fontWeight: 560, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)", boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s" })}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.label}
        </button>
      );
    })}
  </div>
);

const OptionGroup = ({ value, options, onChange, cols = 2 }: { value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void; cols?: number }) => (
  <div style={st({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 })}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={st({ borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 560, cursor: "pointer", textAlign: "center", border: active ? "1px solid var(--accent)" : "1px solid var(--ink-200)", background: active ? "var(--accent-softer)" : "var(--white)", color: active ? "var(--accent-strong)" : "var(--ink-700)" })}>
          {o.label}
        </button>
      );
    })}
  </div>
);

const ColorField = ({ mode, color, onMode, onColor }: { mode: string; color: string; onMode: (v: string) => void; onColor: (v: string) => void }) => (
  <div style={st({ display: "flex", flexDirection: "column", gap: 8 })}>
    <Segmented value={mode} onChange={onMode} options={[{ value: "inherit", label: "Inherit brand" }, { value: "custom", label: "Custom" }]} />
    {mode === "custom" && (
      <input type="color" value={color} onChange={(e) => onColor(e.target.value)} style={st({ width: "100%", height: 34, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", padding: 2 })} />
    )}
  </div>
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <button type="button" onClick={() => onChange(!checked)} style={st({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", border: 0, background: "transparent", cursor: "pointer", padding: 0 })}>
    <span style={st({ fontSize: 13, color: "var(--ink-700)" })}>{label}</span>
    <span style={st({ width: 36, height: 21, borderRadius: 999, flex: "none", background: checked ? "var(--accent)" : "var(--ink-300)", transition: "background .16s", position: "relative" })}>
      <span style={st({ position: "absolute", top: 2, left: checked ? 17 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left .16s" })} />
    </span>
  </button>
);

const Swatches = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => (
  <div style={st({ display: "flex", gap: 8 })}>
    {options.map((c) => (
      <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
        style={st({ width: 26, height: 26, borderRadius: 8, cursor: "pointer", background: c, border: value === c ? "2px solid var(--ink-900)" : "2px solid transparent", boxShadow: value === c ? "0 0 0 2px #fff inset" : "inset 0 0 0 1px rgba(0,0,0,.08)", transition: "all .12s" })} />
    ))}
  </div>
);

/* ── font size slider ────────────────────────────────────────────────────── */
const FontSlider = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div style={st({ display: "flex", flexDirection: "column", gap: 4 })}>
    <div style={st({ display: "flex", justifyContent: "space-between", alignItems: "baseline" })}>
      <span style={st({ fontSize: 12, color: "var(--ink-500)", fontWeight: 560 })}>{label}</span>
      <span style={st({ fontSize: 11.5, fontWeight: 600, color: "var(--ink-700)" })}>{value}px</span>
    </div>
    <input type="range" min={min} max={max} step={1} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={st({ width: "100%", accentColor: "var(--accent)" })} />
    <div style={st({ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink-400)" })}>
      <span>{min}px</span><span>{max}px</span>
    </div>
  </div>
);

/* ── faux browser frame (ported from mock) ───────────────────────────────── */
const SiteFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={st({ width: "100%", margin: "0 auto", borderRadius: 14, overflow: "hidden", border: "1px solid var(--ink-200)", background: "#fff", boxShadow: "var(--shadow-lg)" })}>
    <div style={st({ height: 38, background: "var(--ink-50)", borderBottom: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" })}>
      <span style={st({ width: 10, height: 10, borderRadius: "50%", background: "#f0625a" })} />
      <span style={st({ width: 10, height: 10, borderRadius: "50%", background: "#f5bd4f" })} />
      <span style={st({ width: 10, height: 10, borderRadius: "50%", background: "#62c554" })} />
      <div style={st({ marginLeft: 10, flex: 1, maxWidth: 280, height: 22, borderRadius: 6, background: "var(--white)", border: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 6, padding: "0 9px", fontSize: 11, color: "var(--ink-400)" })}>
        <Icon name="plug" size={11} />yoursite.com
      </div>
    </div>
    {children}
  </div>
);

/* ── embed code block ────────────────────────────────────────────────────── */
const EmbedCode = ({ code, hint }: { code: string; hint: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="card" style={st({ overflow: "hidden" })}>
      <div style={st({ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderBottom: "1px solid var(--ink-200)" })}>
        <Icon name="code" size={17} style={{ color: "var(--accent)" }} />
        <span style={st({ fontSize: 14, fontWeight: 620 })}>Embed code</span>
        <span className="badge badge-neutral" style={st({ marginLeft: 4 })}>{hint}</span>
        <button type="button" className={`btn btn-sm ${copied ? "btn-soft" : "btn-secondary"}`} style={st({ marginLeft: "auto" })} onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre style={st({ margin: 0, padding: "16px 18px", background: "#0f0f13", color: "#e4e4e7", fontSize: 12.5, lineHeight: 1.7, fontFamily: "var(--font-mono)", overflowX: "auto" })}>{code}</pre>
    </div>
  );
};

/* ================= Studio editor ================= */
export function WidgetStudioEditor({ widget, embedScriptUrl, locations = [], aiSummaryText = null, aiSummaryCount = null }: { widget: StudioWidget; embedScriptUrl: string; locations?: Array<{ id: string; name: string }>; aiSummaryText?: string | null; aiSummaryCount?: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [name, setName] = useState(widget.name);
  const [locationId] = useState(widget.locationId);
  const [locationSwitching, setLocationSwitching] = useState(false);
  const [typeKey, setTypeKey] = useState<TypeKey>(deriveTypeKey(widget));
  const [content, setContent] = useState<ContentKey>(deriveContent(widget.contentType));
  const [dark, setDark] = useState(widget.theme === "dark");
  const [accent, setAccent] = useState(widget.primaryColor || "#4f46e5");
  const [minRating, setMinRating] = useState(widget.minRating || 1);
  const [pageSize, setPageSize] = useState(snapPageSize(widget.pageSize || 12));
  const [marqueeSpeed, setMarqueeSpeed] = useState(widget.marqueeSpeed || "normal");
  // Display toggles
  const [showHeader, setShowHeader] = useState(widget.showHeader);
  const [showAvgRating, setShowAvgRating] = useState(widget.showAvgRating);
  const [showReviewCount, setShowReviewCount] = useState(widget.showReviewCount);
  const [showReviewerName, setShowReviewerName] = useState(widget.showReviewerName);
  const [showDate, setShowDate] = useState(widget.showDate);
  const [showSourceLogo, setShowSourceLogo] = useState(widget.showSourceLogo);
  const [showRating, setShowRating] = useState(widget.showRating);
  const [showWriteReview, setShowWriteReview] = useState(widget.showWriteReview);
  const [showAiSummary, setShowAiSummary] = useState(widget.showAiSummary);
  const [showResponses, setShowResponses] = useState(widget.showResponses);
  const [showNav, setShowNav] = useState(widget.showNav);
  const [showPagination, setShowPagination] = useState(widget.showPagination);
  const [showBranding, setShowBranding] = useState(widget.showBranding);
  // Typography & Colors
  const [starColor, setStarColor] = useState(widget.starColor ?? "#fbbf24");
  const [fontSizeBase, setFontSizeBase] = useState(widget.fontSizeBase ?? 14);
  const [fontSizeNames, setFontSizeNames] = useState(widget.fontSizeNames ?? 13);
  const [fontSizeHeader, setFontSizeHeader] = useState(widget.fontSizeHeader ?? 20);
  const [fontSizeLabel, setFontSizeLabel] = useState(widget.fontSizeLabel ?? 12);
  const [fontSizeSummary, setFontSizeSummary] = useState(widget.fontSizeSummary ?? 14);
  const [bodyMaxChars, setBodyMaxChars] = useState(widget.bodyMaxChars ?? 280);
  // Appearance & style
  const [fontFamily, setFontFamily] = useState(widget.fontFamily || "system");
  const [starColorMode, setStarColorMode] = useState(widget.starColorMode || "gold");
  const [cornerRadius, setCornerRadius] = useState(widget.cornerRadius ?? 12);
  const [cardStyle, setCardStyle] = useState(widget.cardStyle || "border");
  const [density, setDensity] = useState(widget.density || "cozy");
  const [gridColumns, setGridColumns] = useState(widget.gridColumns || "auto");
  const [wallStyle, setWallStyle] = useState(widget.wallStyle || "varied");
  // Sources: parse CSV string into a Set
  const ALL_SOURCES = ["GOOGLE", "FACEBOOK", "YELP", "INTERNAL"] as const;
  const SOURCE_LABELS: Record<string, string> = { GOOGLE: "Google", FACEBOOK: "Facebook", YELP: "Yelp", INTERNAL: "WeHearYou" };
  const parseEnabledSources = (csv: string): Set<string> => {
    if (!csv || csv.trim() === "") return new Set(ALL_SOURCES);
    return new Set(csv.split(",").map((s) => s.trim()).filter(Boolean));
  };
  const [enabledSourcesSet, setEnabledSourcesSet] = useState<Set<string>>(() => parseEnabledSources(widget.enabledSources || ""));
  const [isActive, setIsActive] = useState(widget.isActive);
  // Badge
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>((widget.badgeStyle as BadgeStyle) || "rating");
  // Collecting
  const [collectPosition, setCollectPosition] = useState(widget.collectButtonPosition || "bottom-right");
  const [collectTheme, setCollectTheme] = useState(widget.collectButtonTheme || "default");
  const [collectColorMode, setCollectColorMode] = useState(widget.collectButtonColor ? "custom" : "inherit");
  const [collectColor, setCollectColor] = useState(widget.collectButtonColor || "#4f46e5");
  const [collectMobile, setCollectMobile] = useState(widget.collectMobileBehavior || "pill");
  // Floating
  const [floatingCardStyle, setFloatingCardStyle] = useState(widget.floatingCardStyle || "dark_solid_pill");
  const [floatingVariation, setFloatingVariation] = useState(widget.floatingVariation || "standard");
  const [floatingPosition, setFloatingPosition] = useState(widget.floatingPosition || "bottom-right");
  const [floatingRotation, setFloatingRotation] = useState(widget.floatingRotationEnabled ?? true);
  const [floatingInterval, setFloatingInterval] = useState(widget.floatingRotationIntervalSec ?? 8);
  const [floatingAccentMode, setFloatingAccentMode] = useState(widget.floatingAccentColorMode || "inherit");
  const [floatingAccentColor, setFloatingAccentColor] = useState(widget.floatingAccentColor || "#4f46e5");
  const [floatingMobile, setFloatingMobile] = useState(widget.floatingMobileBehavior || "show");
  const [floatingApprovedOnly, setFloatingApprovedOnly] = useState(widget.floatingApprovedOnly ?? true);
  const [floatingMinRating, setFloatingMinRating] = useState(widget.floatingMinRating ?? 4);
  const [realPayload, setRealPayload] = useState<any>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Fetch real widget data for live preview
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch(`/api/public/widgets/${widget.publicToken}?page=1`);
        if (res.ok) {
          const data = await res.json();
          setRealPayload(data);
        }
      } catch (e) {
        console.error("Failed to fetch widget preview data", e);
      }
    };
    fetchRealData();
  }, [widget.publicToken]);

  const isBadge = typeKey === "badge";
  const isSingle = typeKey === "single";
  const isCollecting = typeKey === "collecting";
  const isFloating = typeKey === "floating";
  const isReviewWall = typeKey === "grid" || typeKey === "carousel";

  const effectiveContent: ContentKey = !isReviewWall ? "reviews" : content;
  const previewSettings: Partial<PreviewSettings> = {
    type: typeKey,
    theme: dark ? "dark" : "light",
    accent,
    content: effectiveContent,
    minRating,
    maxReviews: pageSize,
    marqueeSpeed,
    showHeader,
    showDates: showDate,
    showAvatars: showReviewerName,
    showSources: showSourceLogo,
    showBranding,
    showRating,
    showAvgRating,
    showReviewCount,
    showWriteReview,
    showNav,
    showPagination,
    showResponses,
    starColor,
    fontSizeBase,
    fontSizeNames,
    fontSizeHeader,
    fontSizeLabel,
    fontSizeSummary,
    bodyMaxChars,
    radius: cornerRadius,
    cardStyle: cardStyle as PreviewSettings["cardStyle"],
    density: density as PreviewSettings["density"],
    gridColumns,
    wallStyle: wallStyle as PreviewSettings["wallStyle"],
    fontFamily,
    starColorMode: starColorMode as PreviewSettings["starColorMode"],
    aiSummary: isReviewWall && content !== "videos" && showAiSummary,
    aiSummaryText,
    aiSummaryCount,
    badgeStyle,
    collectPosition: collectPosition as PreviewSettings["collectPosition"],
    collectTheme: collectTheme as PreviewSettings["collectTheme"],
    collectColor: collectColorMode === "custom" ? collectColor : null,
    floatingCardStyle: floatingCardStyle as PreviewSettings["floatingCardStyle"],
    floatingVariation: floatingVariation as PreviewSettings["floatingVariation"],
    floatingPosition: floatingPosition as PreviewSettings["floatingPosition"],
    floatingAccentColor: floatingAccentMode === "custom" ? floatingAccentColor : accent,
    floatingMinRating,
  };

  const scriptSrc = `${embedScriptUrl}?t=${widget.publicToken}`;
  const embedCode = isCollecting || isFloating
    ? `<script src="${scriptSrc}" data-token="${widget.publicToken}"></script>`
    : `<div id="why-widget-${widget.publicToken}"></div><script src="${scriptSrc}" data-token="${widget.publicToken}" data-mount="#why-widget-${widget.publicToken}"></script>`;

  const handleSave = async () => {
    setSaveState("saving");
    const { widgetType, layout } = TYPE_TO_FIELDS[typeKey];
    const fd = new FormData();
    fd.append("widgetId", widget.id);
    fd.append("name", (name || "").trim() || "Untitled widget");
    fd.append("widgetType", widgetType);
    fd.append("layout", layout);
    fd.append("contentType", resolveContentType(typeKey, content));
    fd.append("theme", dark ? "dark" : "light");
    fd.append("primaryColor", accent);
    fd.append("minRating", String(minRating));
    fd.append("pageSize", String(pageSize));
    fd.append("marqueeSpeed", marqueeSpeed);
    if (isActive) fd.append("isActive", "on");
    // Display toggles
    if (showHeader) fd.append("showHeader", "on");
    if (showAvgRating) fd.append("showAvgRating", "on");
    if (showReviewCount) fd.append("showReviewCount", "on");
    if (showRating) fd.append("showRating", "on");
    if (showReviewerName) fd.append("showReviewerName", "on");
    if (showDate) fd.append("showDate", "on");
    if (showWriteReview) fd.append("showWriteReview", "on");
    if (showSourceLogo) fd.append("showSourceLogo", "on");
    if (showAiSummary) fd.append("showAiSummary", "on");
    if (showResponses) fd.append("showResponses", "on");
    if (showNav) fd.append("showNav", "on");
    if (showPagination) fd.append("showPagination", "on");
    if (showBranding) fd.append("showBranding", "on");
    // Typography
    fd.append("fontSizeBase", String(fontSizeBase));
    fd.append("fontSizeNames", String(fontSizeNames));
    fd.append("fontSizeHeader", String(fontSizeHeader));
    fd.append("fontSizeLabel", String(fontSizeLabel));
    fd.append("fontSizeSummary", String(fontSizeSummary));
    fd.append("bodyMaxChars", String(bodyMaxChars));

    // Badge
    fd.append("badgeStyle", badgeStyle);
    // Collecting (display frequency intentionally omitted)
    fd.append("collectButtonPosition", collectPosition);
    fd.append("collectButtonTheme", collectTheme);
    fd.append("collectButtonColor", collectColorMode === "custom" ? collectColor : "");
    fd.append("collectMobileBehavior", collectMobile);
    // Floating (display frequency intentionally omitted)
    fd.append("floatingCardStyle", floatingCardStyle);
    fd.append("floatingVariation", floatingVariation);
    fd.append("floatingPosition", floatingPosition);
    if (floatingRotation) fd.append("floatingRotationEnabled", "on");
    fd.append("floatingRotationIntervalSec", String(floatingInterval));
    fd.append("floatingAccentColorMode", floatingAccentMode);
    fd.append("floatingAccentColor", floatingAccentMode === "custom" ? floatingAccentColor : "");
    fd.append("floatingMobileBehavior", floatingMobile);
    if (floatingApprovedOnly) fd.append("floatingApprovedOnly", "on");
    fd.append("floatingMinRating", String(floatingMinRating));

    // Appearance & style
    fd.append("fontFamily", fontFamily);
    fd.append("starColorMode", starColorMode);
    fd.append("cornerRadius", String(cornerRadius));
    fd.append("cardStyle", cardStyle);
    fd.append("density", density);
    fd.append("gridColumns", gridColumns);
    fd.append("wallStyle", wallStyle);
    // Sources: serialize Set back to CSV (empty string = all enabled)
    const allEnabled = ALL_SOURCES.every((s) => enabledSourcesSet.has(s));
    fd.append("enabledSources", allEnabled ? "" : Array.from(enabledSourcesSet).join(","));
    // preserved-as-is fields the editor doesn't expose
    fd.append("sort", widget.sort);
    fd.append("headerAlign", widget.headerAlign);
    fd.append("starColor", widget.starColor);
    fd.append("backgroundColor", widget.backgroundColor);
    fd.append("textColor", widget.textColor);

    try {
      await updateReviewWidget(fd);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1600);
    } catch (e) {
      if (isRedirectError(e)) {
        setSaveState("saved");
        return;
      }
      setSaveState("error");
    }
  };

  return (
    <div style={st({ maxWidth: 1320, margin: "0 auto" })}>
      {/* header */}
      <div style={st({ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" })}>
        <div style={st({ minWidth: 0 })}>
          <Link href="/widgets" className="tap focus-ring" style={st({ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--ink-500)", fontSize: 12.5, fontWeight: 560, padding: "2px 0", marginBottom: 8 })}>
            <Icon name="chevDown" size={15} style={{ transform: "rotate(90deg)" }} />All widgets
          </Link>
          <div className="eyebrow" style={st({ marginBottom: 6 })}>Editing widget</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this widget…" spellCheck={false} className="focus-ring"
            style={st({ display: "block", border: "1px solid transparent", background: "transparent", outline: "none", fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", color: "var(--ink-900)", padding: "2px 8px", margin: "0 0 0 -8px", borderRadius: "var(--r-sm)", width: "min(440px, 80vw)" })} />
          <p style={st({ fontSize: 13.5, color: "var(--ink-500)", marginTop: 6 })}>Design your review widget, then copy the embed code. Changes preview live.</p>
        </div>
        <div style={st({ display: "flex", gap: 10 })}>
          <button type="button" className={`btn ${saveState === "saved" ? "btn-soft" : "btn-primary"}`} onClick={handleSave} disabled={saveState === "saving"}>
            <Icon name="check" size={16} />{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>

      {/* type selector */}
      <div style={st({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: "var(--gutter)" })} className="wtype-grid">
        {STUDIO_TYPES.map((w) => {
          const active = typeKey === w.id;
          return (
            <button key={w.id} type="button" onClick={() => setTypeKey(w.id)} className="tap focus-ring"
              style={st({ textAlign: "left", cursor: "pointer", padding: 15, borderRadius: "var(--r-lg)", border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: active ? "var(--accent-softer)" : "var(--white)", boxShadow: active ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" })}>
              <span style={st({ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", marginBottom: 11, background: active ? "var(--accent)" : "var(--ink-100)", color: active ? "#fff" : "var(--ink-500)" })}>
                <Icon name={w.icon} size={18} />
              </span>
              <div style={st({ fontSize: 13.5, fontWeight: 620 })}>{w.label}</div>
              <div style={st({ fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 })}>{w.desc}</div>
            </button>
          );
        })}
      </div>

      {/* main: controls + preview */}
      <div style={st({ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: "var(--gutter)", alignItems: "start" })} className="wstudio-grid">
        {/* controls */}
        <div className="card" style={st({ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: "var(--gutter)" })}>
          <div style={st({ display: "flex", alignItems: "center", gap: 8 })}>
            <Icon name="sliders" size={16} style={{ color: "var(--accent)" }} />
            <span style={st({ fontSize: 14, fontWeight: 640 })}>Customize</span>
          </div>

          {locations.length > 0 && (
            <Field label="Location">
              <select
                value={locationId}
                disabled={locationSwitching}
                onChange={async (e) => {
                  const newLocationId = e.target.value;
                  if (newLocationId === locationId) return;
                  setLocationSwitching(true);
                  try {
                    const { widgetId } = await getOrCreateWidgetForLocation(widget.id, newLocationId);
                    router.push(`/widgets/${widgetId}`);
                  } catch {
                    setLocationSwitching(false);
                  }
                }}
                style={st({ width: "100%", borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--ink-50)", padding: "8px 11px", fontSize: 13, color: "var(--ink-900)", outline: "none" })}
              >
                {locations.some((l) => l.id === locationId) ? null : <option value={locationId}>Current location</option>}
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          )}

          {isReviewWall && (
            <Field label="Content">
              <Segmented<ContentKey>
                value={content}
                onChange={setContent}
                options={[{ value: "reviews", label: "Reviews" }, { value: "videos", label: "Videos" }, { value: "mixed", label: "Mixed" }]}
              />
            </Field>
          )}
          {isSingle && (
            <Field label="Content">
              <Segmented<ContentKey>
                value={content === "videos" ? "videos" : "reviews"}
                onChange={setContent}
                options={[{ value: "reviews", label: "Text" }, { value: "videos", label: "Video" }]}
              />
            </Field>
          )}

          <Field label="Appearance">
            <Segmented value={dark ? "dark" : "light"} onChange={(v) => setDark(v === "dark")} options={[{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }]} />
          </Field>
          <Field label="Accent">
            <Swatches value={accent} onChange={setAccent} options={ACCENTS} />
          </Field>

          {/* ── Typography & Style ── */}
          {(isReviewWall || isSingle) && (
            <>
              <div className="hr" />
              <Field label="Font">
                <Segmented value={fontFamily} onChange={setFontFamily} options={[
                  { value: "system", label: "System" },
                  { value: "sans", label: "Sans" },
                  { value: "serif", label: "Serif" },
                  { value: "round", label: "Round" },
                  { value: "mono", label: "Mono" },
                ]} />
              </Field>
              <Field label="Star color">
                <Segmented value={starColorMode} onChange={setStarColorMode} options={[
                  { value: "gold", label: "Gold" },
                  { value: "accent", label: "Accent" },
                  { value: "ink", label: "Ink" },
                ]} />
              </Field>
              <Field label="Corner radius" hint={`${cornerRadius}px`}>
                <input type="range" min={0} max={22} step={1} value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  style={st({ width: "100%", accentColor: "var(--accent)" })} />
                <div style={st({ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink-400)", marginTop: 2 })}>
                  <span>0</span><span>22px</span>
                </div>
              </Field>
              <Field label="Card style">
                <OptionGroup cols={3} value={cardStyle} onChange={setCardStyle} options={[
                  { value: "border", label: "Bordered" },
                  { value: "shadow", label: "Shadow" },
                  { value: "soft", label: "Soft" },
                ]} />
              </Field>
              <Field label="Density">
                <Segmented value={density} onChange={setDensity} options={[
                  { value: "cozy", label: "Cozy" },
                  { value: "compact", label: "Compact" },
                ]} />
              </Field>
              {typeKey === "grid" && (
                <>
                  <Field label="Columns">
                    <Segmented value={gridColumns} onChange={setGridColumns} options={[
                      { value: "auto", label: "Auto" },
                      { value: "2", label: "2" },
                      { value: "3", label: "3" },
                    ]} />
                  </Field>
                  <Field label="Wall layout">
                    <Segmented value={wallStyle} onChange={setWallStyle} options={[
                      { value: "varied", label: "Varied" },
                      { value: "uniform", label: "Uniform" },
                    ]} />
                  </Field>
                </>
              )}
            </>
          )}

          {/* ── Badge style ── */}
          {isBadge && (
            <>
              <div className="hr" />
              <Field label="Badge style">
                <OptionGroup value={badgeStyle} onChange={(v) => setBadgeStyle(v as BadgeStyle)} options={[
                  { value: "rating", label: "Rating" },
                  { value: "compact", label: "Compact" },
                  { value: "review_cta", label: "Review CTA" },
                  { value: "trust", label: "Trust" },
                ]} />
              </Field>
            </>
          )}

          {/* ── Collecting controls ── */}
          {isCollecting && (
            <>
              <div className="hr" />
              <Field label="Button position">
                <OptionGroup value={collectPosition} onChange={setCollectPosition} options={[
                  { value: "bottom-right", label: "Bottom Right" },
                  { value: "bottom-left", label: "Bottom Left" },
                  { value: "right", label: "Right Tab" },
                  { value: "left", label: "Left Tab" },
                ]} />
              </Field>
              <Field label="Button style">
                <OptionGroup cols={3} value={collectTheme} onChange={setCollectTheme} options={[
                  { value: "default", label: "Default" },
                  { value: "minimal", label: "Minimal" },
                  { value: "branded", label: "Branded" },
                ]} />
              </Field>
              <Field label="Button color">
                <ColorField mode={collectColorMode} color={collectColor} onMode={setCollectColorMode} onColor={setCollectColor} />
              </Field>
              <Field label="Mobile behavior">
                <Segmented value={collectMobile} onChange={setCollectMobile} options={[{ value: "pill", label: "Show on mobile" }, { value: "hidden", label: "Hide on mobile" }]} />
              </Field>
            </>
          )}

          {/* ── Floating controls ── */}
          {isFloating && (
            <>
              <div className="hr" />
              <Field label="Card style">
                <OptionGroup value={floatingCardStyle} onChange={setFloatingCardStyle} options={[
                  { value: "dark_solid_pill", label: "Dark Pill" },
                  { value: "frosted_glass_pill", label: "Frosted Pill" },
                  { value: "notification_compact", label: "Notification" },
                  { value: "below_card", label: "Below Card" },
                ]} />
              </Field>
              <Field label="Size">
                <OptionGroup cols={3} value={floatingVariation} onChange={setFloatingVariation} options={[
                  { value: "compact", label: "Compact" },
                  { value: "standard", label: "Standard" },
                  { value: "rich", label: "Rich" },
                ]} />
              </Field>
              <Field label="Position">
                <OptionGroup value={floatingPosition} onChange={setFloatingPosition} options={[
                  { value: "bottom-right", label: "Bottom Right" },
                  { value: "bottom-left", label: "Bottom Left" },
                  { value: "right", label: "Right Edge" },
                  { value: "left", label: "Left Edge" },
                ]} />
              </Field>
              <Field label="Rotation">
                <div style={st({ display: "flex", flexDirection: "column", gap: 10 })}>
                  <Toggle checked={floatingRotation} onChange={setFloatingRotation} label="Auto-rotate reviews" />
                  {floatingRotation && (
                    <OptionGroup cols={4} value={String(floatingInterval)} onChange={(v) => setFloatingInterval(Number(v))} options={[
                      { value: "5", label: "5s" }, { value: "8", label: "8s" }, { value: "12", label: "12s" }, { value: "30", label: "30s" },
                    ]} />
                  )}
                </div>
              </Field>
              <Field label="Accent color">
                <ColorField mode={floatingAccentMode} color={floatingAccentColor} onMode={setFloatingAccentMode} onColor={setFloatingAccentColor} />
              </Field>
              <Field label="Mobile behavior">
                <OptionGroup cols={3} value={floatingMobile} onChange={setFloatingMobile} options={[
                  { value: "show", label: "Show" }, { value: "compact", label: "Compact" }, { value: "hide", label: "Hide" },
                ]} />
              </Field>
              <Field label="Content filters">
                <div style={st({ display: "flex", flexDirection: "column", gap: 12 })}>
                  <Toggle checked={floatingApprovedOnly} onChange={setFloatingApprovedOnly} label="Approved reviews only" />
                  <Segmented value={String(floatingMinRating)} onChange={(v) => setFloatingMinRating(Number(v))} options={[{ value: "4", label: "4★ & up" }, { value: "5", label: "5★ only" }]} />
                </div>
              </Field>
            </>
          )}

          {/* ── Review wall + single shared controls ── */}
          {(isReviewWall || isSingle) && (
            <>
              <div className="hr" />
              <Field label="Sources">
                <div style={st({ display: "flex", flexDirection: "column", gap: 11 })}>
                  {ALL_SOURCES.map((src) => (
                    <div key={src} style={st({ display: "flex", alignItems: "center", gap: 9 })}>
                      <span style={st({ fontSize: 13, color: "var(--ink-700)", flex: 1 })}>{SOURCE_LABELS[src]}</span>
                      <Toggle
                        checked={enabledSourcesSet.has(src)}
                        onChange={(v) => {
                          setEnabledSourcesSet((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(src); else next.delete(src);
                            return next;
                          });
                        }}
                        label=""
                      />
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Minimum rating" hint={`${minRating}★ and up`}>
                <input type="range" min={1} max={5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} style={st({ width: "100%", accentColor: "var(--accent)" })} />
              </Field>
              {isReviewWall && (
                <Field label="Max reviews shown" hint={`${pageSize}`}>
                  <div style={st({ display: "flex", flexWrap: "wrap", gap: 6 })}>
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <button key={opt} type="button" onClick={() => setPageSize(opt)}
                        style={st({ minWidth: 38, borderRadius: 8, padding: "6px 9px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: pageSize === opt ? "1px solid var(--accent)" : "1px solid var(--ink-200)", background: pageSize === opt ? "var(--accent-softer)" : "var(--white)", color: pageSize === opt ? "var(--accent-strong)" : "var(--ink-600)" })}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              {typeKey === "carousel" && (
                <Field label="Scroll speed">
                  <Segmented value={marqueeSpeed} onChange={setMarqueeSpeed} options={[{ value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }]} />
                </Field>
              )}
              <div className="hr" />
              <Field label="Display">
                <div style={st({ display: "flex", flexDirection: "column", gap: 12 })}>
                  <Toggle checked={showHeader} onChange={setShowHeader} label="Summary header" />
                  {showHeader && <Toggle checked={showAvgRating} onChange={setShowAvgRating} label="Average rating" />}
                  {showHeader && <Toggle checked={showReviewCount} onChange={setShowReviewCount} label="Review count" />}
                  <Toggle checked={showReviewerName} onChange={setShowReviewerName} label="Reviewer names & avatars" />
                  <Toggle checked={showRating} onChange={setShowRating} label="Star ratings" />
                  <Toggle checked={showDate} onChange={setShowDate} label="Review dates" />
                  <Toggle checked={showSourceLogo} onChange={setShowSourceLogo} label="Source logos" />
                  <Toggle checked={showResponses} onChange={setShowResponses} label="Owner responses" />
                  {isReviewWall && <Toggle checked={showWriteReview} onChange={setShowWriteReview} label="Write a review link" />}
                  {isReviewWall && content !== "videos" && <Toggle checked={showAiSummary} onChange={setShowAiSummary} label="AI summary" />}
                  {isReviewWall && <Toggle checked={showNav} onChange={setShowNav} label="Navigation arrows" />}
                  {isReviewWall && <Toggle checked={showPagination} onChange={setShowPagination} label="Pagination / load more" />}
                  <Toggle checked={showBranding} onChange={setShowBranding} label="WeHearYou branding" />
                </div>
              </Field>

              {/* ── Typography ── */}
              <div className="hr" />
              <Field label="Typography">
                <div style={st({ display: "flex", flexDirection: "column", gap: 14 })}>
                  <FontSlider label="Review text" value={fontSizeBase} min={11} max={18} onChange={setFontSizeBase} />
                  <FontSlider label="Reviewer names" value={fontSizeNames} min={10} max={16} onChange={setFontSizeNames} />
                  <FontSlider label="Header title" value={fontSizeHeader} min={14} max={28} onChange={setFontSizeHeader} />
                  <FontSlider label="Dates & labels" value={fontSizeLabel} min={10} max={14} onChange={setFontSizeLabel} />
                  {content !== "videos" && <FontSlider label="AI summary text" value={fontSizeSummary} min={11} max={16} onChange={setFontSizeSummary} />}
                </div>
              </Field>

              {/* ── Review text length ── */}
              <div className="hr" />
              <Field label="Review text limit" hint={`${bodyMaxChars} chars`}>
                <input type="range" min={80} max={600} step={20} value={bodyMaxChars}
                  onChange={(e) => setBodyMaxChars(Number(e.target.value))}
                  style={st({ width: "100%", accentColor: "var(--accent)" })} />
                <div style={st({ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink-400)", marginTop: 2 })}>
                  <span>80</span><span>600 chars</span>
                </div>
              </Field>
            </>
          )}

          <div className="hr" />
          <Field label="Status">
            <Toggle checked={isActive} onChange={setIsActive} label="Widget active" />
          </Field>
        </div>

        {/* preview */}
        <div style={st({ display: "flex", flexDirection: "column", gap: "var(--gutter)", position: "sticky", top: "var(--gutter)", height: "fit-content" })}>
          <div className="card" style={st({ padding: 0, overflow: "hidden" })}>
            <div style={st({ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--ink-200)" })}>
              <span className="badge badge-success"><span style={st({ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" })} />Live preview</span>
              <span style={st({ fontSize: 12.5, color: "var(--ink-400)" })}>Updates as you edit</span>
            </div>
            <div style={st({ padding: 28, background: "repeating-linear-gradient(45deg, var(--ink-50), var(--ink-50) 10px, var(--page) 10px, var(--page) 20px)" })}>
              <SiteFrame>
                <div style={st({ position: "relative", background: dark ? "#17171b" : "#ffffff", minHeight: 320 })}>
                  <div style={st({ padding: "26px 30px" })}>
                    <div style={st({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 })}>
                      <div style={st({ display: "flex", alignItems: "center", gap: 8 })}>
                        <span style={st({ width: 26, height: 26, borderRadius: 7, background: accent })} />
                        <span style={st({ fontWeight: 700, fontSize: 15, color: dark ? "#f4f4f5" : "#18181b" })}>Your Business</span>
                      </div>
                      <div style={st({ display: "flex", gap: 16, fontSize: 13, color: dark ? "#a1a1aa" : "#52525b" })}><span>Services</span><span>About</span><span>Book</span></div>
                    </div>
                    {!isBadge && (
                      <div style={st({ marginBottom: 22 })}>
                        <div style={st({ fontSize: 30, fontWeight: 720, letterSpacing: "-.03em", color: dark ? "#f4f4f5" : "#18181b", maxWidth: 440 })}>Trusted by happy customers</div>
                        <div style={st({ fontSize: 14, color: dark ? "#a1a1aa" : "#52525b", marginTop: 8 })}>See what our community is saying.</div>
                      </div>
                    )}
                    <WidgetMockPreview
                      settings={previewSettings}
                      realReviews={realPayload?.reviews}
                      locationStats={realPayload?.location ? { avgRating: realPayload.location.avgRating, reviewCount: realPayload.location.reviewCount } : undefined}
                    />
                  </div>
                </div>
              </SiteFrame>
            </div>
          </div>

          <EmbedCode code={embedCode} hint={isCollecting || isFloating ? "Add to global <head>" : "Paste where you want it to appear"} />
        </div>
      </div>
    </div>
  );
}
