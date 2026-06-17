"use client";

import React, { useState } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Icon, type IconName } from "@/components/icon";
import { WidgetMockPreview, type PreviewSettings } from "@/components/widget-mock-preview";
import { updateReviewWidget } from "@/app/widgets/actions";

const st = (s: React.CSSProperties): React.CSSProperties => s;

const PAGE_SIZE_OPTIONS = [2, 4, 6, 8, 10, 12, 16];
const ACCENTS = ["#4f46e5", "#2563eb", "#0e9488", "#7c3aed", "#e0533d", "#18181b"];

type TypeKey = "grid" | "carousel" | "single" | "badge";

const STUDIO_TYPES: Array<{ id: TypeKey; label: string; icon: IconName; desc: string }> = [
  { id: "grid", label: "Wall of Love", icon: "grid", desc: "Masonry of reviews" },
  { id: "carousel", label: "Review carousel", icon: "layers", desc: "Scrolling row of reviews" },
  { id: "single", label: "Single testimonial", icon: "film", desc: "One standout quote" },
  { id: "badge", label: "Rating badge", icon: "star", desc: "Compact score + stars" },
];

// What each type maps to in the real schema.
const TYPE_TO_FIELDS: Record<TypeKey, { widgetType: string; layout: string }> = {
  grid: { widgetType: "WALL_OF_LOVE", layout: "masonry" },
  carousel: { widgetType: "WALL_OF_LOVE", layout: "carousel" },
  single: { widgetType: "SINGLE_TESTIMONIAL", layout: "grid" },
  badge: { widgetType: "BADGE", layout: "badge" },
};

export type StudioWidget = {
  id: string;
  publicToken: string;
  name: string;
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
  // preserved-as-is fields (not exposed in this simple editor)
  badgeStyle: string | null;
  sort: string;
  headerAlign: string;
  bodyMaxChars: number;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  showAvgRating: boolean;
  showReviewCount: boolean;
  showResponses: boolean;
};

function deriveTypeKey(w: StudioWidget): TypeKey {
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

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
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
const EmbedCode = ({ code }: { code: string }) => {
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
        <span className="badge badge-neutral" style={st({ marginLeft: 4 })}>Paste before &lt;/body&gt;</span>
        <button type="button" className={`btn btn-sm ${copied ? "btn-soft" : "btn-secondary"}`} style={st({ marginLeft: "auto" })} onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre style={st({ margin: 0, padding: "16px 18px", background: "#0f0f13", color: "#e4e4e7", fontSize: 12.5, lineHeight: 1.7, fontFamily: "var(--font-mono)", overflowX: "auto" })}>{code}</pre>
    </div>
  );
};

/* ================= Studio editor ================= */
export function WidgetStudioEditor({ widget, embedScriptUrl }: { widget: StudioWidget; embedScriptUrl: string }) {
  const [name, setName] = useState(widget.name);
  const [typeKey, setTypeKey] = useState<TypeKey>(deriveTypeKey(widget));
  const [dark, setDark] = useState(widget.theme === "dark");
  const [accent, setAccent] = useState(widget.primaryColor || "#4f46e5");
  const [minRating, setMinRating] = useState(widget.minRating || 1);
  const [pageSize, setPageSize] = useState(snapPageSize(widget.pageSize || 12));
  const [showHeader, setShowHeader] = useState(widget.showHeader);
  const [showReviewerName, setShowReviewerName] = useState(widget.showReviewerName);
  const [showDate, setShowDate] = useState(widget.showDate);
  const [showSourceLogo, setShowSourceLogo] = useState(widget.showSourceLogo);
  const [showRating, setShowRating] = useState(widget.showRating);
  const [showWriteReview, setShowWriteReview] = useState(widget.showWriteReview);
  const [isActive, setIsActive] = useState(widget.isActive);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const previewSettings: Partial<PreviewSettings> = {
    type: typeKey,
    theme: dark ? "dark" : "light",
    accent,
    content: "reviews",
    minRating,
    maxReviews: pageSize,
    showHeader,
    showDates: showDate,
    showAvatars: showReviewerName,
    showSources: showSourceLogo,
    showBranding: true,
    aiSummary: false,
  };

  const scriptSrc = `${embedScriptUrl}?t=${widget.publicToken}`;
  const embedCode = `<div id="why-widget-${widget.publicToken}"></div>\n<script src="${scriptSrc}" data-token="${widget.publicToken}" data-mount="#why-widget-${widget.publicToken}"></script>`;

  const isBadge = typeKey === "badge";
  const isSingle = typeKey === "single";

  const handleSave = async () => {
    setSaveState("saving");
    const { widgetType, layout } = TYPE_TO_FIELDS[typeKey];
    const fd = new FormData();
    fd.append("widgetId", widget.id);
    fd.append("name", (name || "").trim() || "Untitled widget");
    fd.append("widgetType", widgetType);
    fd.append("layout", layout);
    fd.append("contentType", "TEXT");
    fd.append("theme", dark ? "dark" : "light");
    fd.append("primaryColor", accent);
    fd.append("minRating", String(minRating));
    fd.append("pageSize", String(pageSize));
    if (isActive) fd.append("isActive", "on");
    if (showHeader) fd.append("showHeader", "on");
    if (showRating) fd.append("showRating", "on");
    if (showReviewerName) fd.append("showReviewerName", "on");
    if (showDate) fd.append("showDate", "on");
    if (showWriteReview) fd.append("showWriteReview", "on");
    if (showSourceLogo) fd.append("showSourceLogo", "on");
    // preserved-as-is fields the simple editor doesn't expose
    fd.append("badgeStyle", widget.badgeStyle ?? "");
    fd.append("sort", widget.sort);
    fd.append("headerAlign", widget.headerAlign);
    fd.append("bodyMaxChars", String(widget.bodyMaxChars));
    fd.append("starColor", widget.starColor);
    fd.append("backgroundColor", widget.backgroundColor);
    fd.append("textColor", widget.textColor);
    fd.append("fontFamily", widget.fontFamily);
    if (widget.showAvgRating) fd.append("showAvgRating", "on");
    if (widget.showReviewCount) fd.append("showReviewCount", "on");
    if (widget.showResponses) fd.append("showResponses", "on");
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
      <div style={st({ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "var(--gutter)" })} className="wtype-grid">
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

          <Field label="Appearance">
            <Segmented value={dark ? "dark" : "light"} onChange={(v) => setDark(v === "dark")} options={[{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }]} />
          </Field>
          <Field label="Accent">
            <Swatches value={accent} onChange={setAccent} options={ACCENTS} />
          </Field>

          <div className="hr" />

          <Field label="Minimum rating" hint={`${minRating}★ and up`}>
            <input type="range" min={1} max={5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} style={st({ width: "100%", accentColor: "var(--accent)" })} />
          </Field>

          {!isBadge && !isSingle && (
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

          <div className="hr" />

          <Field label="Display">
            <div style={st({ display: "flex", flexDirection: "column", gap: 12 })}>
              {!isBadge && <Toggle checked={showHeader} onChange={setShowHeader} label="Summary header" />}
              {!isBadge && <Toggle checked={showReviewerName} onChange={setShowReviewerName} label="Reviewer names & avatars" />}
              {!isBadge && <Toggle checked={showRating} onChange={setShowRating} label="Star ratings" />}
              {!isBadge && <Toggle checked={showDate} onChange={setShowDate} label="Review dates" />}
              {!isBadge && <Toggle checked={showSourceLogo} onChange={setShowSourceLogo} label="Source logos" />}
              {!isBadge && !isSingle && <Toggle checked={showWriteReview} onChange={setShowWriteReview} label="Write a review link" />}
              <Toggle checked={isActive} onChange={setIsActive} label="Widget active" />
            </div>
          </Field>
        </div>

        {/* preview */}
        <div style={st({ display: "flex", flexDirection: "column", gap: "var(--gutter)" })}>
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
                    <WidgetMockPreview settings={previewSettings} />
                  </div>
                </div>
              </SiteFrame>
            </div>
          </div>

          <EmbedCode code={embedCode} />
        </div>
      </div>
    </div>
  );
}
