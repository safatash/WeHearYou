/* WeHearYou — Review Funnel: shared kit.
   Customer-facing flow shown after someone clicks a review-request link.
   Built on WeHearYou design tokens (styles.css); reuses <Icon/>.
   Mobile-first; a device toggle previews mobile vs. desktop wizard. */

const { useState: useStateFK, useEffect: useEffectFK, useRef: useRefFK } = React;

/* ---------- Demo business (matches the reference funnel) ---------- */
const BIZ = {
  name: "NOVA Advertising",
  location: "Fairfax, VA",
  category: "Marketing & SEO Agency",
  initial: "N",
  hue: 187,
};

/* destinations an admin enabled; Google is the preferred/primary one */
const DESTINATIONS = [
  { id: "google", label: "Google", color: "var(--src-google)", glyph: "G", preferred: true },
  { id: "wehearyou", label: "WeHearYou", color: "var(--accent)", glyph: "W" },
  { id: "facebook", label: "Facebook", color: "var(--src-facebook)", glyph: "f" },
  { id: "yelp", label: "Yelp", color: "var(--src-yelp)", glyph: "Y" },
  { id: "trustpilot", label: "Trustpilot", color: "var(--src-trustpilot)", glyph: "★" },
];

/* positive: what stood out */
const STOOD_OUT = [
  "Great Website Design", "Highly Recommend", "Improved SEO & Rankings", "Real Results",
  "Professional Team", "Knowledgeable", "Went Above & Beyond", "Great Communication",
  "Friendly Staff", "Great Service", "Fair Pricing", "Easy Process", "Would Recommend",
];
const SERVICES = ["Website Design", "Local SEO", "Google Ads", "Branding", "Social Media", "Content Marketing", "Full-service Retainer"];

/* negative: issue categories */
const ISSUES = [
  "Long Wait Time", "Poor Communication", "Scheduling Issue", "Billing Concern",
  "Staff Interaction", "Service Quality", "Unexpected Cost", "Problem Not Resolved", "Other",
];

const RATING_LABELS = { 1: "Poor", 2: "Needs Improvement", 3: "Okay", 4: "Good", 5: "Excellent" };

/* ---------- mock AI generators (deterministic, no network) ---------- */
const joinNice = (arr) => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];

function buildReview({ chips, service, helper, extra }, variant = "detailed", tone = "balanced") {
  const lc = chips.map(c => c.toLowerCase());
  const has = (s) => lc.some(c => c.includes(s));
  const svc = service ? service.toLowerCase() : "work";
  const who = helper ? `${helper} and the team` : "the team";

  if (variant === "short") {
    let s = `Fantastic experience with ${BIZ.name}`;
    if (service) s += ` for our ${svc}`;
    s += ". ";
    const pts = [];
    if (has("design")) pts.push("the website design was excellent");
    if (has("seo") || has("rank") || has("result")) pts.push("we've already seen real results");
    if (has("communication") || has("knowledge")) pts.push("communication was clear throughout");
    if (!pts.length) pts.push("the whole process was easy");
    s += capitalize(joinNice(pts)) + ". ";
    if (has("recommend")) s += "Highly recommend!";
    else s += `${who.charAt(0).toUpperCase() + who.slice(1)} made it easy.`;
    return s;
  }

  // detailed
  const open = tone === "casual"
    ? `Honestly, such a great experience with ${BIZ.name}!`
    : tone === "professional"
      ? `I had an excellent experience working with ${BIZ.name}.`
      : `I had a fantastic experience with ${BIZ.name}!`;
  let body = ` From the very beginning${has("easy") ? ", the whole process was so easy" : ""}, `;
  if (helper) body += `${helper} `;
  body += `${who === helper + " and the team" ? "and the team " : ""}`;
  const mids = [];
  if (has("design")) mids.push("I was especially impressed with the great website design");
  if (service && !has("design")) mids.push(`their ${svc} work was exactly what we needed`);
  if (has("communication")) mids.push("everything was communicated clearly and simply");
  if (has("professional") || has("knowledge")) mids.push("the team was professional and really knew their stuff");
  if (mids.length) body += capitalize(joinNice(mids)) + ". ";
  else body += "they made everything clear and simple. ";
  if (has("seo") || has("rank") || has("result")) {
    body += `Since partnering with them, I've genuinely seen improved SEO and rankings, which is exactly what I was hoping for. `;
  }
  if (extra) body += extra.trim().replace(/\.?$/, ". ");
  body += has("recommend")
    ? `I highly recommend ${BIZ.name} to anyone looking to enhance their online presence and get real results.`
    : `If you're in ${BIZ.location} and want a team that delivers, give them a look.`;
  return open + body;
}
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function clarifyFeedback(text, issues) {
  if (!text || !text.trim()) {
    return `My recent experience with ${BIZ.name} fell short of what I expected${issues.length ? ", mainly around " + joinNice(issues.map(i => i.toLowerCase())) : ""}. I'd appreciate the chance to have this looked into.`;
  }
  const lead = issues.length ? `I want to share feedback about ${joinNice(issues.map(i => i.toLowerCase()))}. ` : "";
  const tidy = text.trim().replace(/\s+/g, " ");
  const ended = /[.!?]$/.test(tidy) ? tidy : tidy + ".";
  return lead + capitalize(ended) + " I'm sharing this so it can be addressed and improved going forward.";
}

/* ---------- Brand header ---------- */
const BizHeader = ({ size = "md" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size === "lg" ? 13 : 11, justifyContent: "center" }}>
    <span style={{ width: size === "lg" ? 48 : 40, height: size === "lg" ? 48 : 40, borderRadius: size === "lg" ? 13 : 11, flex: "none",
      display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: size === "lg" ? 22 : 18,
      background: `linear-gradient(145deg, hsl(${BIZ.hue} 56% 44%), hsl(${BIZ.hue} 60% 30%))`, boxShadow: "var(--shadow-sm)" }}>{BIZ.initial}</span>
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: size === "lg" ? 17 : 15, fontWeight: 660, letterSpacing: "-.01em" }}>{BIZ.name}</div>
      <div style={{ fontSize: size === "lg" ? 12.5 : 11.5, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="pin" size={11} />{BIZ.location}
      </div>
    </div>
  </div>
);

/* ---------- Progress (stepper) ---------- */
const Stepper = ({ step, total, tone = "accent" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => {
      const done = i < step, cur = i === step;
      return (
        <span key={i} style={{ height: 5, flex: 1, borderRadius: 999, transition: "background .3s, transform .3s",
          background: done || cur ? "var(--accent)" : "var(--ink-200)", transform: cur ? "scaleY(1.4)" : "none", transformOrigin: "center" }} />
      );
    })}
  </div>
);
const StepLabel = ({ step, total, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
    <span className="eyebrow" style={{ color: "var(--accent-strong)" }}>{label}</span>
    <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)", fontWeight: 600 }}>Step {step + 1} of {total}</span>
  </div>
);

/* ---------- Funnel chip (large touch target) ---------- */
const FChip = ({ label, active, onClick }) => (
  <button onClick={onClick} className="tap" data-active={active} style={{
    display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44, padding: "0 17px", borderRadius: 999, cursor: "pointer",
    fontSize: 14.5, fontWeight: 560, fontFamily: "inherit", lineHeight: 1.1, transition: "background .14s, border-color .14s, color .14s, transform .08s",
    border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--ink-200)",
    background: active ? "var(--accent)" : "var(--white)", color: active ? "var(--accent-fg)" : "var(--ink-700)",
    boxShadow: active ? "var(--shadow-sm)" : "var(--shadow-xs)" }}>
    {active && <Icon name="check" size={15} />}
    {label}
  </button>
);
const ChipWrap = ({ children }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{children}</div>;

/* ---------- Big primary / secondary button ---------- */
const BigBtn = ({ children, onClick, variant = "primary", disabled, full = true, icon, style = {} }) => (
  <button onClick={onClick} disabled={disabled} className="tap" style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
    width: full ? "100%" : "auto", minHeight: 52, padding: "0 24px", borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15.5, fontWeight: 600, fontFamily: "inherit", border: "1.5px solid transparent", opacity: disabled ? .45 : 1,
    transition: "background .14s, border-color .14s, color .14s, transform .06s, box-shadow .14s",
    ...(variant === "primary" ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.16)" }
      : variant === "secondary" ? { background: "var(--white)", color: "var(--ink-800)", borderColor: "var(--ink-200)", boxShadow: "var(--shadow-xs)" }
      : { background: "var(--ink-100)", color: "var(--ink-700)" }),
    ...style }}>
    {children}{icon && <Icon name={icon} size={18} />}
  </button>
);

/* ---------- Tone/length action button (small pill) ---------- */
const ActionPill = ({ children, onClick, active, icon }) => (
  <button onClick={onClick} className="tap" data-active={active} style={{
    display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "0 14px", borderRadius: 999, cursor: "pointer",
    fontSize: 13, fontWeight: 560, fontFamily: "inherit", transition: "background .14s, border-color .14s, color .14s",
    border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
    background: active ? "var(--accent-soft)" : "var(--white)", color: active ? "var(--accent-strong)" : "var(--ink-600)" }}>
    {icon && <Icon name={icon} size={14} />}{children}
  </button>
);

/* ---------- Animated star picker ---------- */
const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useStateFK(0);
  const shown = hover || value;
  return (
    <div style={{ textAlign: "center" }}>
      <div onMouseLeave={() => setHover(0)} style={{ display: "inline-flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const on = n <= shown;
          return (
            <button key={n} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="tap" style={{ border: 0, background: "transparent", cursor: "pointer", padding: 4, lineHeight: 0,
                transform: on ? "scale(1)" : "scale(.94)", transition: "transform .16s cubic-bezier(.2,.7,.2,1)" }}>
              <svg viewBox="0 0 24 24" width="44" height="44" fill={on ? "var(--star)" : "none"} stroke={on ? "var(--star)" : "var(--ink-300)"} strokeWidth="1.6" strokeLinejoin="round"
                style={{ transition: "fill .16s, stroke .16s, filter .16s", filter: on ? "drop-shadow(0 2px 5px color-mix(in srgb, var(--star) 45%, transparent))" : "none" }}>
                <path d="M12 2.5l2.9 6.06 6.6.86-4.85 4.55 1.24 6.58L12 18.6l-5.93 3.41 1.24-6.58L2.46 9.42l6.6-.86z" />
              </svg>
            </button>
          );
        })}
      </div>
      <div style={{ height: 22, marginTop: 6 }}>
        {shown > 0 && <span key={shown} className="anim-up" style={{ fontSize: 14.5, fontWeight: 640, color: shown >= 4 ? "var(--accent-strong)" : shown === 3 ? "var(--warning)" : "var(--ink-500)" }}>{RATING_LABELS[shown]}</span>}
      </div>
    </div>
  );
};

/* ---------- AI "thinking" loader ---------- */
const AiThinking = ({ label = "Writing your review…" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
    <div style={{ position: "relative", width: 52, height: 52 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid var(--accent-soft)" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "var(--accent)", animation: "fkspin .8s linear infinite" }} />
      <Icon name="sparkle" size={20} style={{ position: "absolute", inset: 0, margin: "auto", color: "var(--accent-strong)" }} />
    </div>
    <span style={{ fontSize: 14, color: "var(--ink-500)", fontWeight: 540 }}>{label}</span>
  </div>
);

/* ---------- Confetti burst (positive celebration only) ---------- */
const Confetti = ({ fire }) => {
  const ref = useRefFK(null);
  useEffectFK(() => {
    if (!fire || !ref.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = ref.current;
    const colors = ["#37aeb7", "#f3a93c", "#15924f", "#4285f4", "#ec4899", "#8b5cf6"];
    const N = 90;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span");
      const sz = 6 + Math.random() * 7;
      p.style.cssText = `position:absolute;left:50%;top:34%;width:${sz}px;height:${sz * 0.6}px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none;opacity:1;will-change:transform,opacity;`;
      host.appendChild(p);
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      const vel = 120 + Math.random() * 260;
      const dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel - 120;
      const rot = (Math.random() * 720 - 360);
      p.animate([
        { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 360}px)) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.15,.6,.4,1)", fill: "forwards" });
      setTimeout(() => p.remove(), 2000);
    }
  }, [fire]);
  return <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }} />;
};

/* ---------- Success check (animated) ---------- */
const SuccessCheck = ({ tone = "accent", size = 76 }) => {
  const col = tone === "accent" ? "var(--accent)" : "var(--success)";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto",
      background: tone === "accent" ? "var(--accent-soft)" : "var(--success-soft)", animation: "fkpop .4s cubic-bezier(.2,.7,.2,1) both" }}>
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke={col} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "fkdraw .5s .15s cubic-bezier(.2,.7,.2,1) forwards" }} />
      </svg>
    </div>
  );
};

/* ---------- Card surface used by every screen ---------- */
const ScreenCard = ({ children }) => (
  <div className="fk-screencard">{children}</div>
);

/* keyframes */
const __fkStyle = document.createElement("style");
__fkStyle.textContent = `
  @keyframes fkspin { to { transform: rotate(360deg); } }
  @keyframes fkpop { from { opacity:0; transform: scale(.8); } to { opacity:1; transform: none; } }
  @keyframes fkdraw { to { stroke-dashoffset: 0; } }
`;
document.head.appendChild(__fkStyle);

Object.assign(window, {
  BIZ, DESTINATIONS, STOOD_OUT, SERVICES, ISSUES, RATING_LABELS,
  buildReview, clarifyFeedback, BizHeader, Stepper, StepLabel, FChip, ChipWrap,
  BigBtn, ActionPill, StarPicker, AiThinking, Confetti, SuccessCheck, ScreenCard,
});
