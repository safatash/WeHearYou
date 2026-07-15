"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Icon, type IconName } from "@/components/icon";
import { saveCampaignWizard } from "@/app/campaign-wizard/actions";

const st = (s: React.CSSProperties): React.CSSProperties => s;
const inputStyle: React.CSSProperties = { width: "100%", borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--ink-50)", padding: "10px 12px", fontSize: 13.5, color: "var(--ink-900)", outline: "none", fontFamily: "inherit" };

type Location = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  reviewLink: string | null;
  publicProfile: {
    funnelStyle: string | null;
    funnelRatingStyle: string | null;
    funnelPromptTitle: string | null;
    funnelPromptBody: string | null;
    negativeFilterThreshold: number;
    lowRatingDestination: string | null;
    lowRatingCustomUrl: string | null;
    highRatingDestinations: string[];
    highRatingPrimaryDestination: string | null;
    facebookReviewUrl: string | null;
    customReviewUrl: string | null;
  } | null;
};

const STEPS: Array<{ id: string; label: string; sub: string; icon: IconName }> = [
  { id: "locations", label: "Locations", sub: "Where it runs", icon: "pin" },
  { id: "appearance", label: "Appearance", sub: "Funnel page", icon: "eye" },
  { id: "channels", label: "Channels", sub: "Where reviews go", icon: "star" },
  { id: "funnel", label: "Funnel", sub: "Routing logic", icon: "sliders" },
  { id: "message", label: "Message", sub: "The ask", icon: "chat" },
  { id: "review", label: "Review", sub: "Launch", icon: "check" },
];

const RATING_STYLES = [
  { id: "stars", label: "Stars", glyph: "★★★★★" },
  { id: "faces", label: "Faces", glyph: "😞 😐 😊" },
  { id: "thumbs", label: "Thumbs", glyph: "👎 👍" },
];

type RoutingDef = {
  label: string;
  options: Array<{ value: string; label: string }> | null;
  hint: (t: number) => string;
  above: (t: number) => string;
  below: (t: number) => string;
  summary: (t: number) => string;
  rateSub: string;
  defaultT: number;
};
const STYLE_ROUTING: Record<string, RoutingDef> = {
  stars: {
    label: "Public review threshold",
    options: [{ value: "3", label: "3★ +" }, { value: "4", label: "4★ +" }, { value: "5", label: "5★ only" }],
    hint: (t) => `${t}★ and up go public`,
    above: (t) => `${t}★ and up`,
    below: (t) => `Below ${t}★`,
    summary: (t) => `${t}★+ public`,
    rateSub: "Customer taps a star rating",
    defaultT: 4,
  },
  faces: {
    label: "Which faces go public?",
    options: [{ value: "3", label: "😐 & 😊" }, { value: "5", label: "😊 only" }],
    hint: (t) => (t >= 5 ? "Only 😊 happy goes public" : "😐 neutral & 😊 happy go public"),
    above: (t) => (t >= 5 ? "😊 happy" : "😐 😊"),
    below: (t) => (t >= 5 ? "😞 😐" : "😞 unhappy"),
    summary: (t) => (t >= 5 ? "😊 public" : "😐 😊 public"),
    rateSub: "Customer taps a face",
    defaultT: 5,
  },
  thumbs: {
    label: "Routing",
    options: null,
    hint: () => "👍 goes public · 👎 stays private",
    above: () => "👍 thumbs up",
    below: () => "👎 thumbs down",
    summary: () => "👍 public",
    rateSub: "Customer taps thumbs up or down",
    defaultT: 5,
  },
};
const routingFor = (style: string): RoutingDef => STYLE_ROUTING[style] ?? STYLE_ROUTING.stars;

const CHANNELS: Array<{ id: string; label: string; letter: string; color: string; desc: string; first?: boolean; rec?: boolean }> = [
  { id: "WEHEARYOU", label: "WeHearYou", letter: "W", color: "#4f46e5", desc: "Public reviews and private feedback on your WeHearYou profile", first: true },
  { id: "GOOGLE", label: "Google", letter: "G", color: "var(--src-google)", desc: "Public reviews on your Google Business Profile", rec: true },
  { id: "FACEBOOK", label: "Facebook", letter: "f", color: "var(--src-facebook)", desc: "Recommendations on your Facebook page" },
  { id: "CUSTOM", label: "Custom link", letter: "↗", color: "#0e9488", desc: "Send happy customers to any review URL" },
];
const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));

/* ── primitives ─────────────────────────────────────────────────────────── */
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={st({ display: "flex", flexDirection: "column", gap: 8 })}>
    <div style={st({ display: "flex", alignItems: "baseline", justifyContent: "space-between" })}>
      <span style={st({ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" })}>{label}</span>
      {hint && <span style={st({ fontSize: 11.5, color: "var(--ink-400)" })}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Segmented = ({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string; icon?: IconName }>; onChange: (v: string) => void }) => (
  <div style={st({ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" })}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={st({ flex: 1, border: 0, cursor: "pointer", padding: "7px 8px", borderRadius: 5, fontSize: 12.5, fontWeight: 560, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)", boxShadow: active ? "var(--shadow-xs)" : "none" })}>
          {o.icon && <Icon name={o.icon} size={14} />}{o.label}
        </button>
      );
    })}
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!checked)} style={st({ width: 36, height: 21, borderRadius: 999, flex: "none", border: 0, padding: 0, cursor: "pointer", background: checked ? "var(--accent)" : "var(--ink-300)", position: "relative" })}>
    <span style={st({ position: "absolute", top: 2, left: checked ? 17 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left .16s" })} />
  </button>
);

/* ── step rail ──────────────────────────────────────────────────────────── */
const StepRail = ({ step, go, maxReached }: { step: number; go: (n: number) => void; maxReached: number }) => (
  <div style={st({ display: "flex", flexDirection: "column", gap: 2 })}>
    {STEPS.map((s, i) => {
      const active = i === step;
      const done = i < maxReached;
      const reachable = i <= maxReached;
      return (
        <button key={s.id} type="button" disabled={!reachable} onClick={() => reachable && go(i)} className="tap"
          style={st({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r-md)", border: 0, cursor: reachable ? "pointer" : "default", textAlign: "left", background: active ? "var(--accent-soft)" : "transparent", opacity: reachable ? 1 : 0.45 })}>
          <span style={st({ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 680, fontFamily: "var(--font-mono)", background: active ? "var(--accent)" : done ? "var(--success-soft)" : "var(--ink-100)", color: active ? "#fff" : done ? "var(--success)" : "var(--ink-500)", border: active ? "0" : done ? "1px solid color-mix(in srgb, var(--success) 25%, #fff)" : "1px solid var(--ink-200)" })}>
            {done ? <Icon name="check" size={15} /> : i + 1}
          </span>
          <span style={st({ minWidth: 0 })}>
            <span style={st({ display: "block", fontSize: 13.5, fontWeight: active ? 640 : 560, color: active ? "var(--accent-strong)" : "var(--ink-800)" })}>{s.label}</span>
            <span style={st({ display: "block", fontSize: 11.5, color: "var(--ink-400)" })}>{s.sub}</span>
          </span>
        </button>
      );
    })}
  </div>
);

/* ── flow diagram bits ──────────────────────────────────────────────────── */
const FlowNode = ({ icon, title, sub, tone = "neutral", children, compact }: { icon: IconName; title: string; sub?: string; tone?: "neutral" | "accent" | "success" | "danger"; children?: React.ReactNode; compact?: boolean }) => {
  const tones = {
    neutral: { bg: "var(--white)", bd: "var(--ink-200)", ic: "var(--ink-100)", icFg: "var(--ink-600)" },
    accent: { bg: "var(--accent-softer)", bd: "var(--accent-border)", ic: "var(--accent)", icFg: "#fff" },
    success: { bg: "var(--success-soft)", bd: "color-mix(in srgb, var(--success) 25%, #fff)", ic: "var(--success)", icFg: "#fff" },
    danger: { bg: "var(--danger-soft)", bd: "color-mix(in srgb, var(--danger) 25%, #fff)", ic: "var(--danger)", icFg: "#fff" },
  }[tone];
  return (
    <div style={st({ background: tones.bg, border: `1.5px solid ${tones.bd}`, borderRadius: "var(--r-lg)", padding: compact ? "11px 13px" : 15, boxShadow: "var(--shadow-sm)", width: "100%" })}>
      <div style={st({ display: "flex", alignItems: "center", gap: 11 })}>
        <span style={st({ width: 32, height: 32, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: tones.ic, color: tones.icFg })}><Icon name={icon} size={17} /></span>
        <div style={st({ minWidth: 0, flex: 1 })}>
          <div style={st({ fontSize: 13.5, fontWeight: 640 })}>{title}</div>
          {sub && <div style={st({ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1 })}>{sub}</div>}
        </div>
      </div>
      {children && <div style={st({ marginTop: 11 })}>{children}</div>}
    </div>
  );
};
const Connector = ({ h = 26 }: { h?: number }) => <div style={st({ width: 2, height: h, background: "var(--ink-200)", margin: "0 auto" })} />;
const ChannelChip = ({ id }: { id: string }) => {
  const c = CHANNEL_BY_ID[id];
  if (!c) return null;
  return (
    <span style={st({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 540, padding: "2px 7px", borderRadius: 999, background: "var(--white)", border: "1px solid var(--ink-200)" })}>
      <span style={st({ width: 12, height: 12, borderRadius: 3, background: c.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 8, fontWeight: 800, fontFamily: "var(--font-mono)" })}>{c.letter}</span>{c.label}
    </span>
  );
};

/* ── interactive phone preview ──────────────────────────────────────────── */
function PhonePreview({ cfg, stepId }: { cfg: Cfg; stepId: string }) {
  const [rating, setRating] = useState(0);
  const [screen, setScreen] = useState<"rate" | "positive" | "negative">("rate");
  useEffect(() => { setRating(0); setScreen("rate"); }, [stepId, cfg.gateEnabled, cfg.gateThreshold, cfg.ratingStyle]);
  const onChannels = cfg.channels;
  const showMessage = stepId === "message";

  const pick = (n: number) => {
    setRating(n);
    setTimeout(() => setScreen(!cfg.gateEnabled || n >= cfg.gateThreshold ? "positive" : "negative"), 320);
  };
  const sample = (txt: string) => txt.replace(/\{name\}/g, "Marcus").replace(/\{location\}/g, cfg.locationName).replace(/\{link\}/g, cfg.channel === "sms" ? cfg.funnelUrlShort : "");

  return (
    <div style={st({ position: "sticky", top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 })}>
      <div style={st({ display: "flex", alignItems: "center", gap: 8 })}>
        <span className="badge badge-success"><span style={st({ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" })} />Live preview</span>
        <span style={st({ fontSize: 12, color: "var(--ink-400)" })}>{showMessage ? "Outreach message" : "Funnel experience"}</span>
      </div>
      <div style={st({ width: 280, height: 560, borderRadius: 38, background: "#0d0d12", padding: 9, boxShadow: "var(--shadow-pop)", flex: "none" })}>
        <div style={st({ width: "100%", height: "100%", borderRadius: 30, background: "var(--page)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" })}>
          <div style={st({ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 24, background: "#0d0d12", borderRadius: "0 0 16px 16px", zIndex: 5 })} />
          {showMessage ? (
            <div style={st({ flex: 1, display: "flex", flexDirection: "column", paddingTop: 32, background: "var(--ink-100)" })}>
              <div style={st({ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 9, background: "var(--white)", borderBottom: "1px solid var(--ink-200)" })}>
                <span style={st({ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 13 })}>{cfg.locationName.slice(0, 1)}</span>
                <div><div style={st({ fontSize: 13, fontWeight: 640 })}>{cfg.locationName}</div><div style={st({ fontSize: 10.5, color: "var(--ink-400)" })}>{cfg.channel === "sms" ? "SMS · now" : "Email · now"}</div></div>
              </div>
              <div style={st({ padding: 16, flex: 1 })}>
                {cfg.channel === "email" && <div style={st({ fontSize: 13, fontWeight: 680, marginBottom: 10 })}>{cfg.subject}</div>}
                <div style={st({ background: cfg.channel === "sms" ? "var(--white)" : "transparent", border: cfg.channel === "sms" ? "1px solid var(--ink-200)" : "0", borderRadius: cfg.channel === "sms" ? "4px 16px 16px 16px" : 0, padding: cfg.channel === "sms" ? "11px 13px" : 0, fontSize: 13, lineHeight: 1.55, color: "var(--ink-700)", boxShadow: cfg.channel === "sms" ? "var(--shadow-xs)" : "none" })}>
                  {sample(cfg.message)}
                  {cfg.channel === "email" && <button className="btn btn-primary btn-sm" style={st({ marginTop: 14 })}>Share your experience<Icon name="arrowRight" size={13} /></button>}
                </div>
              </div>
            </div>
          ) : (
            <div style={st({ flex: 1, paddingTop: 36, display: "flex", flexDirection: "column" })}>
              <div style={st({ display: "flex", alignItems: "center", gap: 8, padding: "0 18px 14px", justifyContent: "center" })}>
                <span style={st({ width: 26, height: 26, borderRadius: 7, background: "var(--accent)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 13 })}>{cfg.locationName.slice(0, 1)}</span>
                <span style={st({ fontWeight: 700, fontSize: 14 })}>{cfg.locationName}</span>
              </div>
              {screen === "rate" && (
                <div style={st({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 18 })}>
                  <div>
                    <div style={st({ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" })}>{cfg.headline}</div>
                    <div style={st({ fontSize: 12.5, color: "var(--ink-500)", marginTop: 7, lineHeight: 1.5 })}>{cfg.subheading}</div>
                  </div>
                  {cfg.ratingStyle === "faces" ? (
                    <div style={st({ display: "flex", gap: 14 })}>
                      {[{ e: "😞", v: 2 }, { e: "😐", v: 3 }, { e: "😊", v: 5 }].map((f) => (
                        <button key={f.e} type="button" onClick={() => pick(f.v)} style={st({ border: 0, background: "transparent", cursor: "pointer", fontSize: 38, lineHeight: 1, padding: 2 })}>{f.e}</button>
                      ))}
                    </div>
                  ) : cfg.ratingStyle === "thumbs" ? (
                    <div style={st({ display: "flex", gap: 20 })}>
                      {[{ e: "👎", v: 1 }, { e: "👍", v: 5 }].map((f) => (
                        <button key={f.e} type="button" onClick={() => pick(f.v)} style={st({ border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", fontSize: 30, lineHeight: 1, padding: "12px 18px", borderRadius: 14, boxShadow: "var(--shadow-xs)" })}>{f.e}</button>
                      ))}
                    </div>
                  ) : (
                    <div style={st({ display: "flex", gap: 4 })}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onMouseEnter={() => setRating(n)} onMouseLeave={() => setRating(0)} onClick={() => pick(n)} style={st({ border: 0, background: "transparent", cursor: "pointer", padding: 2 })}>
                          <svg width="33" height="33" viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill={n <= rating ? "var(--star)" : "var(--ink-200)"} /></svg>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={st({ fontSize: 11.5, color: "var(--ink-300)" })}>Tap to preview the routing</div>
                </div>
              )}
              {screen === "positive" && (
                <div style={st({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 16 })}>
                  <span style={st({ width: 52, height: 52, borderRadius: "50%", background: "var(--success-soft)", color: "var(--success)", display: "grid", placeItems: "center" })}><Icon name="check" size={26} /></span>
                  <div>
                    <div style={st({ fontSize: 18, fontWeight: 700 })}>Thank you! 🎉</div>
                    <div style={st({ fontSize: 13, color: "var(--ink-500)", marginTop: 6 })}>Would you share it where others can see?</div>
                  </div>
                  <div style={st({ display: "flex", flexDirection: "column", gap: 9, width: "100%" })}>
                    {onChannels.length ? onChannels.map((id) => {
                      const c = CHANNEL_BY_ID[id];
                      return (
                        <button key={id} type="button" style={st({ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: 11, borderRadius: 10, border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-xs)" })}>
                          <span style={st({ width: 18, height: 18, borderRadius: 4, background: c.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)" })}>{c.letter}</span>
                          Review on {c.label}
                        </button>
                      );
                    }) : <span style={st({ fontSize: 12.5, color: "var(--ink-400)" })}>Select a channel in step 3</span>}
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setScreen("rate"); setRating(0); }}>Start over</button>
                </div>
              )}
              {screen === "negative" && (
                <div style={st({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 14 })}>
                  <span style={st({ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" })}><Icon name="chat" size={24} /></span>
                  <div>
                    <div style={st({ fontSize: 17, fontWeight: 700 })}>We want to make it right</div>
                    <div style={st({ fontSize: 13, color: "var(--ink-500)", marginTop: 6 })}>Tell us what happened — this goes straight to the manager, privately.</div>
                  </div>
                  <div style={st({ width: "100%", height: 70, borderRadius: 10, border: "1px solid var(--ink-200)", background: "var(--white)", padding: 10, fontSize: 12, color: "var(--ink-400)", textAlign: "left" })}>What could we have done better?</div>
                  <button className="btn btn-primary btn-sm" type="button" style={st({ width: "100%" })} onClick={() => { setScreen("rate"); setRating(0); }}>Send privately</button>
                  <div style={st({ fontSize: 10.5, color: "var(--ink-300)" })}>Saved to your WeHearYou inbox · not published publicly</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {!showMessage && <div style={st({ fontSize: 11.5, color: "var(--ink-400)", textAlign: "center", maxWidth: 240 })}>This is exactly what your customer sees. Try tapping the rating.</div>}
    </div>
  );
}

function QRCode({ url }: { url: string }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0f172a&margin=10`;
  return (
    <div style={st({ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Funnel QR code" width={160} height={160} style={st({ borderRadius: 14, border: "1px solid var(--ink-200)" })} />
      <a className="btn btn-secondary btn-sm" href={qr} download="review-qr-code.png"><Icon name="upload" size={14} />Download PNG</a>
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={st({ display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--ink-50)", padding: "9px 12px" })}>
      <span style={st({ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{value}</span>
      <button type="button" className={`btn btn-sm ${copied ? "btn-soft" : "btn-secondary"}`} onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
        <Icon name={copied ? "check" : "copy"} size={13} />{copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

type Cfg = {
  name: string;
  locationIds: string[];
  locationName: string;
  funnelUrl: string;
  funnelUrlShort: string;
  ratingStyle: string;
  headline: string;
  subheading: string;
  channels: string[];
  primaryChannel: string;
  facebookReviewUrl: string;
  customReviewUrl: string;
  gateEnabled: boolean;
  gateThreshold: number;
  lowDestination: string;
  lowCustomUrl: string;
  channel: string;
  delay: number;
  subject: string;
  message: string;
};

const DEFAULT_MSG = {
  sms: "Hi {name}, thanks for visiting {location}! We'd love your quick feedback — it takes 30 seconds: {link}",
  email: "We hope your visit went well! Your feedback helps us improve and helps others find great care. Tap below to share your experience — it only takes a moment.",
};

export function CampaignWizard({ locations, appUrl }: { locations: Location[]; appUrl: string }) {
  const first = locations[0];
  const p = first?.publicProfile;

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewLocationId, setPreviewLocationId] = useState<string | null>(first?.id ?? null);

  const [name, setName] = useState("Post-visit review request");
  const [locationIds, setLocationIds] = useState<string[]>(first ? [first.id] : []);
  const [funnelStyle, setFunnelStyle] = useState(p?.funnelStyle ?? "SIMPLE");
  const [ratingStyle, setRatingStyle] = useState(p?.funnelRatingStyle ?? "stars");
  const [headline, setHeadline] = useState(p?.funnelPromptTitle ?? `How was your experience with ${first?.name ?? "us"}?`);
  const [subheading, setSubheading] = useState(p?.funnelPromptBody ?? "Happy customers can continue to a public review, while lower ratings stay private so our team can follow up directly.");
  const [channels, setChannels] = useState<string[]>(
    Array.isArray(p?.highRatingDestinations) && p.highRatingDestinations.length > 0
      ? p.highRatingDestinations
      : ["WEHEARYOU", "GOOGLE"]
  );
  const [primaryChannel, setPrimaryChannel] = useState(p?.highRatingPrimaryDestination ?? "");
  const [facebookReviewUrl, setFacebookReviewUrl] = useState(p?.facebookReviewUrl ?? "");
  const [customReviewUrl, setCustomReviewUrl] = useState(p?.customReviewUrl ?? "");
  const [gateEnabled, setGateEnabled] = useState(true);
  const [gateThreshold, setGateThreshold] = useState(p?.negativeFilterThreshold ?? 4);
  const [lowDestination, setLowDestination] = useState(p?.lowRatingDestination ?? "PRIVATE");
  const [lowCustomUrl, setLowCustomUrl] = useState(p?.lowRatingCustomUrl ?? "");
  const [channel, setChannel] = useState("sms");
  const [delay, setDelay] = useState(2);
  const [subject, setSubject] = useState(`How was your visit to ${first?.name ?? "us"}?`);
  const [message, setMessage] = useState(DEFAULT_MSG.sms);

  // keep the threshold valid for the chosen rating style
  useEffect(() => {
    setGateThreshold((t) => {
      if (ratingStyle === "thumbs") return 5;
      if (ratingStyle === "faces") return t >= 4 ? 5 : 3;
      return [3, 4, 5].includes(t) ? t : 4;
    });
  }, [ratingStyle]);

  // swap default message when channel flips
  useEffect(() => {
    setMessage((m) => ((channel === "sms" && m === DEFAULT_MSG.email) || (channel === "email" && m === DEFAULT_MSG.sms) ? DEFAULT_MSG[channel] : m));
  }, [channel]);

  const selectedLocations = locations.filter((l) => locationIds.includes(l.id));
  const previewLocation = locations.find((l) => l.id === previewLocationId) || selectedLocations[0] || first;

  // update form state when preview location changes
  useEffect(() => {
    const currentLocation = previewLocation;
    if (currentLocation?.publicProfile) {
      const profile = currentLocation.publicProfile;
      setFunnelStyle(profile.funnelStyle ?? "SIMPLE");
      setRatingStyle(profile.funnelRatingStyle ?? "stars");
      setHeadline(profile.funnelPromptTitle ?? `How was your experience with ${currentLocation.name}?`);
      setSubheading(profile.funnelPromptBody ?? "Happy customers can continue to a public review, while lower ratings stay private so our team can follow up directly.");
      setChannels(
        Array.isArray(profile.highRatingDestinations) && profile.highRatingDestinations.length > 0
          ? profile.highRatingDestinations
          : ["WEHEARYOU", "GOOGLE"]
      );
      setPrimaryChannel(profile.highRatingPrimaryDestination ?? "");
      setGateThreshold(profile.negativeFilterThreshold ?? 4);
      setLowDestination(profile.lowRatingDestination ?? "PRIVATE");
      setLowCustomUrl(profile.lowRatingCustomUrl ?? "");
      setFacebookReviewUrl(profile.facebookReviewUrl ?? "");
      setCustomReviewUrl(profile.customReviewUrl ?? "");
    }
  }, [previewLocation]);
  const funnelUrl = previewLocation ? `${appUrl}/f/${previewLocation.slug}` : "";

  const cfg: Cfg = {
    name, locationIds, locationName: previewLocation?.name ?? "Your business", funnelUrl,
    funnelUrlShort: previewLocation ? `wehr.yt/f/${previewLocation.slug.slice(0, 6)}` : "",
    ratingStyle, headline, subheading, channels, primaryChannel, facebookReviewUrl, customReviewUrl,
    gateEnabled, gateThreshold, lowDestination, lowCustomUrl, channel, delay, subject, message,
  };

  const toggleLocation = (id: string) => {
    setLocationIds((prev) => {
      const newIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!newIds.includes(previewLocationId ?? "")) {
        setPreviewLocationId(newIds[0] ?? null);
      } else {
        setPreviewLocationId(id);
      }
      return newIds;
    });
  };
  const toggleChannel = (id: string) => setChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const stepId = STEPS[step].id;
  const isLast = stepId === "review";
  const canNext = stepId === "locations" ? locationIds.length > 0 : stepId === "channels" ? channels.length > 0 : true;
  const go = (n: number) => { const c = Math.max(0, Math.min(STEPS.length - 1, n)); setStep(c); setMaxReached((m) => Math.max(m, c)); };

  function handleSave() {
    startTransition(async () => {
      const dests = channels.length > 0 ? channels : ["WEHEARYOU"];
      for (const locId of locationIds.length ? locationIds : [first?.id].filter(Boolean) as string[]) {
        const fd = new FormData();
        fd.append("locationId", locId);
        fd.append("funnelStyle", funnelStyle);
        fd.append("funnelRatingStyle", ratingStyle);
        fd.append("funnelPromptTitle", headline);
        fd.append("funnelPromptBody", subheading);
        fd.append("negativeFilterEnabled", gateEnabled ? "true" : "false");
        fd.append("negativeFilterThreshold", String(gateThreshold));
        fd.append("lowRatingDestination", lowDestination);
        fd.append("lowRatingCustomUrl", lowCustomUrl);
        dests.forEach((d) => fd.append("highRatingDestinations", d));
        fd.append("highRatingMode", dests.length > 1 ? "MULTIPLE" : "SINGLE");
        fd.append("highRatingPrimaryDestination", dests.length > 1 ? (dests.includes(primaryChannel) ? primaryChannel : dests[0]) : "");
        fd.append("facebookReviewUrl", facebookReviewUrl);
        fd.append("customReviewUrl", customReviewUrl);
        await saveCampaignWizard(fd);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    });
  }

  const rt = routingFor(ratingStyle);

  return (
    <div className="card" style={st({ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 680 })}>
      {/* header */}
      <header style={st({ flex: "none", borderBottom: "1px solid var(--ink-200)", background: "var(--white)", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", height: 60 })}>
        <div style={st({ fontSize: 14, fontWeight: 700 })}>New campaign</div>
        <div style={st({ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 })}>
          <span style={st({ fontSize: 12.5, color: "var(--ink-400)" })}>Step {step + 1} of {STEPS.length}</span>
          <div style={st({ width: 140, height: 5, borderRadius: 999, background: "var(--ink-150)", overflow: "hidden" })}>
            <div style={st({ height: "100%", borderRadius: 999, background: "var(--accent)", width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width .3s" })} />
          </div>
        </div>
      </header>

      {/* body */}
      <div className="cw-body" style={st({ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "220px minmax(0,1fr) 340px" })}>
        {/* rail */}
        <div style={st({ borderRight: "1px solid var(--ink-200)", padding: 18, background: "var(--white)" })}>
          <StepRail step={step} go={go} maxReached={maxReached} />
          <div style={st({ marginTop: 20, padding: 13, borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" })}>
            <div style={st({ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 })}><Icon name="sparkles" size={14} style={{ color: "var(--ink-400)" }} /><span style={st({ fontSize: 12, fontWeight: 600 })}>{STEPS[step].label}</span></div>
            <p style={st({ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5, margin: 0 })}>{[
              "Choose which locations this campaign configures.",
              "Pick the rating style and copy customers see on the funnel page.",
              "Pick the public review sites happy customers are sent to.",
              "Smart routing sends your happiest customers to public reviews and routes unhappy ones to private feedback first.",
              "Write the SMS or email that invites customers into the funnel.",
              "Double-check everything, then launch.",
            ][step]}</p>
          </div>
        </div>

        {/* panel */}
        <div style={st({ overflowY: "auto", padding: "28px 32px" })}>
          <div style={st({ maxWidth: 560, margin: "0 auto" })}>
            <h1 style={st({ fontSize: 23, fontWeight: 700, letterSpacing: "-.025em", color: "var(--ink-900)" })}>{STEPS[step].label}</h1>
            <p style={st({ fontSize: 13.5, color: "var(--ink-500)", margin: "5px 0 26px" })}>{[
              "Name your campaign and pick where it runs.",
              "Customize what customers see on the funnel page. Preview updates live.",
              "Where should happy customers leave their review?",
              "Configure how customers are routed based on their rating.",
              "Craft the message that drives customers to your funnel.",
              "You're all set — review and launch.",
            ][step]}</p>

            {/* STEP: Locations */}
            {stepId === "locations" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 24 })}>
                <Field label="Campaign name">
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-visit review request" />
                </Field>
                <div>
                  <div style={st({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 })}>
                    <span style={st({ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" })}>Locations</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLocationIds(locationIds.length === locations.length ? [] : locations.map((l) => l.id))}>{locationIds.length === locations.length ? "Clear all" : "Select all"}</button>
                  </div>
                  <div style={st({ display: "flex", flexDirection: "column", gap: 10 })}>
                    {locations.map((l) => {
                      const on = locationIds.includes(l.id);
                      return (
                        <button key={l.id} type="button" onClick={() => toggleLocation(l.id)} className="tap focus-ring"
                          style={st({ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left", border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)", boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" })}>
                          <span style={st({ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", background: on ? "var(--accent)" : "var(--ink-100)", color: on ? "#fff" : "var(--ink-500)" })}><Icon name="pin" size={18} /></span>
                          <span style={st({ flex: 1, minWidth: 0 })}>
                            <span style={st({ display: "block", fontSize: 14, fontWeight: 620 })}>{l.name}</span>
                            <span style={st({ display: "block", fontSize: 12, color: "var(--ink-400)" })}>{[l.city, l.state].filter(Boolean).join(", ") || "No address"}</span>
                          </span>
                          {!l.reviewLink && <span className="badge badge-warning">No review link</span>}
                          <span style={st({ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", border: on ? "0" : "1.5px solid var(--ink-300)", background: on ? "var(--accent)" : "transparent", color: "#fff" })}>{on && <Icon name="check" size={14} />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP: Appearance */}
            {stepId === "appearance" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 24 })}>
                <Field label="Rating style">
                  <div style={st({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 })}>
                    {RATING_STYLES.map((o) => {
                      const on = ratingStyle === o.id;
                      return (
                        <button key={o.id} type="button" onClick={() => setRatingStyle(o.id)} className="tap focus-ring"
                          style={st({ cursor: "pointer", padding: "22px 10px 14px", borderRadius: "var(--r-lg)", textAlign: "center", border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)", boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" })}>
                          <div style={st({ height: 30, display: "grid", placeItems: "center", marginBottom: 12, fontSize: 22, letterSpacing: 2, color: o.id === "stars" ? "var(--star)" : undefined })}>{o.glyph}</div>
                          <div style={st({ fontSize: 13, fontWeight: 600, color: on ? "var(--accent-strong)" : "var(--ink-700)" })}>{o.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Headline"><input style={inputStyle} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="How was your experience?" /></Field>
                <Field label="Subheading"><textarea style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} rows={3} value={subheading} onChange={(e) => setSubheading(e.target.value)} /></Field>
              </div>
            )}

            {/* STEP: Channels */}
            {stepId === "channels" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 18 })}>
                <p style={st({ fontSize: 13.5, color: "var(--ink-500)", lineHeight: 1.55, margin: 0 })}>Pick where happy customers leave a public review. <b style={st({ color: "var(--ink-700)" })}>WeHearYou</b> always captures private feedback from unhappy customers.</p>
                <div style={st({ display: "flex", flexDirection: "column", gap: 10 })}>
                  {CHANNELS.map((c) => {
                    const on = channels.includes(c.id);
                    const isPrimary = primaryChannel === c.id;
                    return (
                      <div key={c.id} style={st({ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: "var(--r-md)", border: on ? "1.5px solid var(--accent-border)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)" })}>
                        <span style={st({ width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", color: "#fff", background: c.color, fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16 })}>{c.letter}</span>
                        <div style={st({ flex: 1, minWidth: 0 })}>
                          <div style={st({ display: "flex", alignItems: "center", gap: 7 })}>
                            <span style={st({ fontSize: 14, fontWeight: 620 })}>{c.label}</span>
                            {c.first && <span className="badge badge-accent">First-party</span>}
                            {c.rec && <span className="badge badge-neutral">Recommended</span>}
                            {on && isPrimary && <span className="badge badge-success">Primary</span>}
                          </div>
                          <div style={st({ fontSize: 12, color: "var(--ink-400)", marginTop: 2 })}>{c.desc}</div>
                        </div>
                        {on && !isPrimary && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrimaryChannel(c.id)}>Make primary</button>}
                        <Toggle checked={on} onChange={(v) => { toggleChannel(c.id); if (v && !primaryChannel) setPrimaryChannel(c.id); }} />
                      </div>
                    );
                  })}
                </div>
                {channels.includes("FACEBOOK") && <Field label="Facebook review URL"><input style={inputStyle} value={facebookReviewUrl} onChange={(e) => setFacebookReviewUrl(e.target.value)} placeholder="https://facebook.com/yourpage/reviews" /></Field>}
                {channels.includes("CUSTOM") && <Field label="Custom review URL"><input style={inputStyle} value={customReviewUrl} onChange={(e) => setCustomReviewUrl(e.target.value)} placeholder="https://…" /></Field>}
              </div>
            )}

            {/* STEP: Funnel */}
            {stepId === "funnel" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 22 })}>
                <Field label="Funnel experience">
                  <div style={st({ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" })}>
                    {([
                      { value: "SIMPLE", label: "Simple funnel", hint: "Straightforward rating → review flow" },
                      { value: "AI_GUIDED", label: "AI-guided funnel", hint: "AI tailors the ask to each customer" },
                    ] as Array<{ value: string; label: string; hint: string }>).map((o) => {
                      const active = funnelStyle === o.value;
                      return (
                        <button key={o.value} type="button" onClick={() => setFunnelStyle(o.value)}
                          style={st({ flex: 1, border: 0, cursor: "pointer", padding: "9px 10px", borderRadius: 5, textAlign: "left", background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)", boxShadow: active ? "var(--shadow-xs)" : "none" })}>
                          <div style={st({ fontSize: 12.5, fontWeight: 580 })}>{o.label}</div>
                          <div style={st({ fontSize: 11.5, marginTop: 2, color: active ? "var(--ink-500)" : "var(--ink-400)" })}>{o.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="card" style={st({ padding: 16, background: "var(--ink-50)" })}>
                  <div style={st({ display: "flex", alignItems: "center", gap: 11, marginBottom: gateEnabled ? 14 : 0 })}>
                    <span style={st({ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" })}><Icon name="sliders" size={17} /></span>
                    <div style={st({ flex: 1 })}>
                      <div style={st({ fontSize: 13.5, fontWeight: 640 })}>Smart routing</div>
                      <div style={st({ fontSize: 12, color: "var(--ink-400)" })}>Send happy customers public, route unhappy ones to private feedback first</div>
                    </div>
                    <Toggle checked={gateEnabled} onChange={setGateEnabled} />
                  </div>
                  {gateEnabled && (
                    <div style={st({ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--ink-200)", paddingTop: 14 })}>
                      {rt.options ? (
                        <Field label={rt.label} hint={rt.hint(gateThreshold)}>
                          <Segmented value={String(gateThreshold)} onChange={(v) => setGateThreshold(Number(v))} options={rt.options} />
                        </Field>
                      ) : (
                        <Field label={rt.label}>
                          <div style={st({ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: "var(--r-sm)", background: "var(--white)", border: "1px solid var(--ink-200)" })}>
                            <span style={st({ fontSize: 18 })}>👍</span><span style={st({ fontSize: 12.5, color: "var(--ink-600)" })}>Thumbs up → public · 👎 down → private feedback</span>
                          </div>
                        </Field>
                      )}
                      <Field label="When rating is below threshold">
                        <Segmented value={lowDestination} onChange={setLowDestination} options={[{ value: "PRIVATE", label: "Private feedback" }, { value: "CUSTOM", label: "Custom recovery URL" }]} />
                      </Field>
                      {lowDestination === "CUSTOM" && <Field label="Recovery URL"><input style={inputStyle} value={lowCustomUrl} onChange={(e) => setLowCustomUrl(e.target.value)} placeholder="https://…" /></Field>}
                    </div>
                  )}
                </div>
                <div>
                  <div className="eyebrow" style={st({ marginBottom: 14 })}>Funnel preview</div>
                  <div style={st({ maxWidth: 460, margin: "0 auto" })}>
                    <FlowNode icon="send" title={`Send ${channel === "sms" ? "SMS" : "email"} request`} sub={`${delay}h after visit`} tone="accent" />
                    <Connector />
                    <FlowNode icon="star" title="Rate your experience" sub={rt.rateSub} />
                    {gateEnabled ? (
                      <>
                        <svg viewBox="0 0 460 46" width="100%" height="46" style={{ display: "block" }}>
                          <path d="M230 0 V14 Q230 23 200 23 H118 Q88 23 88 32 V46" fill="none" stroke="var(--ink-200)" strokeWidth="2" />
                          <path d="M230 0 V14 Q230 23 260 23 H342 Q372 23 372 32 V46" fill="none" stroke="var(--ink-200)" strokeWidth="2" />
                        </svg>
                        <div style={st({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 })}>
                          <div>
                            <div style={st({ textAlign: "center", marginBottom: 8 })}><span className="badge badge-danger">{rt.below(gateThreshold)}</span></div>
                            <FlowNode icon="inbox" title="Private feedback" tone="danger" compact sub={lowDestination === "CUSTOM" ? "Custom recovery URL" : "Saved to WeHearYou inbox"} />
                          </div>
                          <div>
                            <div style={st({ textAlign: "center", marginBottom: 8 })}><span className="badge badge-success">{rt.above(gateThreshold)}</span></div>
                            <FlowNode icon="star" title="Public review" tone="success" compact sub={`${channels.length} channel${channels.length === 1 ? "" : "s"}`}>
                              <div style={st({ display: "flex", flexWrap: "wrap", gap: 5 })}>
                                {channels.length ? channels.map((id) => <ChannelChip key={id} id={id} />) : <span style={st({ fontSize: 11.5, color: "var(--danger)" })}>No channels selected</span>}
                              </div>
                            </FlowNode>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Connector />
                        <FlowNode icon="star" title="Public review" tone="success" sub="All ratings sent to public channels">
                          <div style={st({ display: "flex", flexWrap: "wrap", gap: 5 })}>{channels.map((id) => <ChannelChip key={id} id={id} />)}</div>
                        </FlowNode>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP: Message */}
            {stepId === "message" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 22 })}>
                <Field label="Delivery channel">
                  <Segmented value={channel} onChange={setChannel} options={[{ value: "sms", label: "SMS", icon: "chat" }, { value: "email", label: "Email", icon: "send" }]} />
                </Field>
                <Field label="Send delay" hint={`${delay} hour${delay === 1 ? "" : "s"} after visit`}>
                  <input type="range" min={0} max={48} step={1} value={delay} onChange={(e) => setDelay(Number(e.target.value))} style={st({ width: "100%", accentColor: "var(--accent)" })} />
                  <div style={st({ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-400)" })}><span>Immediately</span><span>48h</span></div>
                </Field>
                {channel === "email" && <Field label="Subject line"><input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>}
                <Field label="Message" hint={channel === "sms" ? `${message.length}/160` : "Body"}>
                  <textarea style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} rows={channel === "sms" ? 4 : 6} value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
                <div style={st({ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" })}>
                  <span style={st({ fontSize: 12, color: "var(--ink-400)" })}>Insert:</span>
                  {["{name}", "{location}", "{link}"].map((tok) => (
                    <button key={tok} type="button" onClick={() => setMessage(message + " " + tok)} style={st({ fontSize: 11.5, fontFamily: "var(--font-mono)", padding: "4px 9px", borderRadius: 6, border: "1px solid var(--ink-200)", background: "var(--ink-50)", color: "var(--accent-strong)", cursor: "pointer" })}>{tok}</button>
                  ))}
                </div>
                <p style={st({ fontSize: 11.5, color: "var(--ink-400)", margin: 0 })}>The funnel settings save to each location. Outreach delivery is handled in Campaigns.</p>
              </div>
            )}

            {/* STEP: Review */}
            {stepId === "review" && (
              <div style={st({ display: "flex", flexDirection: "column", gap: 18 })}>
                <div className="card" style={st({ padding: "4px 18px 8px" })}>
                  <SummaryRow label="Campaign" onEdit={() => go(0)}><span style={st({ fontWeight: 640 })}>{name || "Untitled campaign"}</span></SummaryRow>
                  <SummaryRow label="Locations" onEdit={() => go(0)}>{selectedLocations.length ? selectedLocations.map((l) => <span key={l.id} className="badge badge-neutral"><Icon name="pin" size={11} />{l.name}</span>) : <span style={st({ color: "var(--danger)" })}>None selected</span>}</SummaryRow>
                  <SummaryRow label="Rating style" onEdit={() => go(1)}><span className="badge badge-neutral" style={st({ textTransform: "capitalize" })}>{ratingStyle}</span><span style={st({ color: "var(--ink-400)", fontSize: 12.5 })}>{headline}</span></SummaryRow>
                  <SummaryRow label="Channels" onEdit={() => go(2)}>{channels.map((id) => <ChannelChip key={id} id={id} />)}</SummaryRow>
                  <SummaryRow label="Routing" onEdit={() => go(3)}>{gateEnabled ? <><span className="badge badge-success">{rt.summary(gateThreshold)}</span><span className="badge badge-danger">below → {lowDestination === "CUSTOM" ? "recovery URL" : "private feedback"}</span></> : <span className="badge badge-neutral">All ratings public (gate off)</span>}</SummaryRow>
                  <SummaryRow label="Delivery" onEdit={() => go(4)}><span className="badge badge-accent">{channel === "sms" ? "SMS" : "Email"}</span><span style={st({ color: "var(--ink-500)" })}>{delay}h after visit</span></SummaryRow>
                </div>
                {previewLocation && (
                  <div className="card" style={st({ padding: 18 })}>
                    <div className="eyebrow" style={st({ marginBottom: 12 })}>Shareable funnel{selectedLocations.length > 1 ? ` · ${previewLocation.name}` : ""}</div>
                    <div style={st({ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" })}>
                      <div style={st({ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 })}>
                        <CopyRow value={funnelUrl} />
                        {selectedLocations.length > 1 && <p style={st({ fontSize: 11.5, color: "var(--ink-400)", margin: 0 })}>Each selected location gets its own funnel link.</p>}
                      </div>
                      <QRCode url={funnelUrl} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* preview */}
        <div className="cw-preview" style={st({ borderLeft: "1px solid var(--ink-200)", padding: "24px 18px", overflowY: "auto", background: "linear-gradient(180deg, var(--ink-50), var(--page))" })}>
          {isLast ? (
            <div style={st({ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 16 })}>
              <div className="card" style={st({ padding: 20, textAlign: "center", background: "linear-gradient(170deg, var(--accent-softer), var(--white))" })}>
                <span style={st({ width: 54, height: 54, borderRadius: 16, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-md)" })}><Icon name="megaphone" size={26} /></span>
                <h3 style={st({ fontSize: 17, fontWeight: 700 })}>Ready to launch</h3>
                <p style={st({ fontSize: 12.5, color: "var(--ink-500)", margin: "6px 0 0", lineHeight: 1.5 })}>{name} will apply across {selectedLocations.length} location{selectedLocations.length === 1 ? "" : "s"}.</p>
              </div>
              <div className="card" style={st({ padding: 16 })}>
                <div className="eyebrow" style={st({ marginBottom: 12 })}>Before you launch</div>
                {([["Channels selected", "At least one public review site", channels.length > 0], ["Funnel routing", gateEnabled ? "Smart gate protects your rating" : "Gate is off — all ratings public", true], ["Message length", channel === "sms" ? "Within SMS limits" : "Email body", channel === "email" || message.length <= 160]] as Array<[string, string, boolean]>).map(([t, s, ok]) => (
                  <div key={t} style={st({ display: "flex", gap: 10, padding: "9px 0", borderTop: "1px solid var(--ink-150)" })}>
                    <span style={st({ width: 20, height: 20, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: ok ? "var(--success-soft)" : "var(--warning-soft)", color: ok ? "var(--success)" : "var(--warning)" })}><Icon name={ok ? "check" : "dots"} size={12} /></span>
                    <div><div style={st({ fontSize: 12.5, fontWeight: 580 })}>{t}</div><div style={st({ fontSize: 11, color: "var(--ink-400)" })}>{s}</div></div>
                  </div>
                ))}
              </div>
              <button type="button" className={`btn ${saved ? "btn-soft" : "btn-primary"}`} style={st({ width: "100%", height: 44 })} onClick={handleSave} disabled={isPending}>
                <Icon name="check" size={17} />{isPending ? "Launching…" : saved ? "Launched" : "Launch campaign"}
              </button>
            </div>
          ) : (
            <PhonePreview cfg={cfg} stepId={stepId} />
          )}
        </div>
      </div>

      {/* footer */}
      <footer style={st({ flex: "none", borderTop: "1px solid var(--ink-200)", background: "var(--white)", display: "flex", alignItems: "center", padding: "0 28px", gap: 12, height: 68 })}>
        <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)} disabled={step === 0}><Icon name="arrowRight" size={16} style={{ transform: "rotate(180deg)" }} />Back</button>
        <div style={st({ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 })}>
          <button type="button" className="btn btn-ghost" onClick={handleSave} disabled={isPending}>{saved ? "Saved" : "Save draft"}</button>
          {isLast ? (
            <button type="button" className={`btn ${saved ? "btn-soft" : "btn-primary"}`} onClick={handleSave} disabled={isPending}><Icon name="check" size={16} />{isPending ? "Launching…" : saved ? "Launched" : "Launch campaign"}</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => canNext && go(step + 1)} aria-disabled={!canNext} style={st({ opacity: canNext ? 1 : 0.5, pointerEvents: canNext ? "auto" : "none" })}>Continue<Icon name="arrowRight" size={16} /></button>
          )}
        </div>
      </footer>
    </div>
  );
}

const SummaryRow = ({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit: () => void }) => (
  <div style={st({ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderTop: "1px solid var(--ink-150)" })}>
    <span style={st({ width: 90, flex: "none", fontSize: 12.5, color: "var(--ink-400)", paddingTop: 1 })}>{label}</span>
    <div style={st({ flex: 1, fontSize: 13.5, fontWeight: 540, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" })}>{children}</div>
    <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
  </div>
);
