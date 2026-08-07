/* WeHearYou — Widget Studio: customize an embeddable review widget + get code */

const { useState: useStateW, useEffect: useEffectW } = React;

/* ---------- small control primitives ---------- */
const Field = ({ label, hint, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" }}>{label}</span>
      {hint && <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Segmented = ({ value, options, onChange }) => (
  <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
    {options.map(o => {
      const active = value === o.value;
      return (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{ flex: 1, border: 0, cursor: "pointer", padding: "6px 8px", borderRadius: 5, fontSize: 12.5, fontWeight: 560,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)",
            boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s" }}>
          {o.icon && <Icon name={o.icon} size={14}/>}{o.label}
        </button>
      );
    })}
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <button onClick={() => onChange(!checked)}
    style={{ display: "flex", alignItems: "center", justifyContent: label ? "space-between" : "center", gap: label ? 12 : 0,
      width: label ? "100%" : "auto", flex: "none", border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
    {label && <span style={{ fontSize: 13, color: "var(--ink-700)" }}>{label}</span>}
    <span style={{ width: 36, height: 21, borderRadius: 999, flex: "none", background: checked ? "var(--accent)" : "var(--ink-300)", transition: "background .16s", position: "relative" }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 17 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left .16s" }}/>
    </span>
  </button>
);

const Slider = ({ value, min, max, step = 1, onChange }) => (
  <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
    style={{ width: "100%", accentColor: "var(--accent)" }}/>
);

const Swatches = ({ value, options, onChange }) => (
  <div style={{ display: "flex", gap: 8 }}>
    {options.map(c => (
      <button key={c} onClick={() => onChange(c)} aria-label={c}
        style={{ width: 26, height: 26, borderRadius: 8, cursor: "pointer", background: c,
          border: value === c ? "2px solid var(--ink-900)" : "2px solid transparent",
          boxShadow: value === c ? "0 0 0 2px #fff inset" : "inset 0 0 0 1px rgba(0,0,0,.08)", transition: "all .12s" }}/>
    ))}
  </div>
);

/* ---------- widget renderers (self-themed) ---------- */
const wTokens = (s) => s.theme === "dark"
  ? { bg: "#17171b", card: "#212126", line: "#2e2e35", text: "#f4f4f5", sub: "#a1a1aa", muted: "#71717a" }
  : { bg: "#ffffff", card: "#ffffff", line: "#e6e6ea", text: "#18181b", sub: "#52525b", muted: "#a1a1aa" };

/* ---------- customization helpers ---------- */
const FONT_STACKS = {
  sans:    "'Geist', system-ui, -apple-system, sans-serif",
  serif:   "'Newsreader', Georgia, 'Times New Roman', serif",
  rounded: "'Nunito', 'Geist', system-ui, sans-serif",
  mono:    "'Geist Mono', ui-monospace, 'SF Mono', monospace",
};
const FONT_OPTS = [
  { value: "sans", label: "Sans" }, { value: "serif", label: "Serif" },
  { value: "rounded", label: "Round" }, { value: "mono", label: "Mono" },
];
const STAR_PRESET = { gold: "#f3a93c", dark: "#27272a" };
const starColorOf = (s) => s.starColor === "accent" ? s.accent : (STAR_PRESET[s.starColor] || "#f3a93c");
const SPEED_BASE = { slow: 60, normal: 40, fast: 24 };
const dPad = (s, base) => Math.round(base * (s.density === "compact" ? 0.72 : 1));
const cardChrome = (s, tk) => {
  if (s.cardStyle === "shadow") return {
    background: tk.card, border: "1px solid " + (s.theme === "dark" ? tk.line : "transparent"),
    boxShadow: s.theme === "dark" ? "0 12px 32px -14px rgba(0,0,0,.65)" : "0 12px 28px -14px rgba(24,24,27,.22)",
  };
  if (s.cardStyle === "soft") return {
    background: s.theme === "dark" ? "#26262d" : "#f4f4f5", border: "1px solid transparent", boxShadow: "none",
  };
  return { background: tk.card, border: "1px solid " + tk.line, boxShadow: s.theme === "dark" ? "none" : "0 1px 2px rgba(24,24,27,.05)" };
};

const VerifiedTag = ({ s, tk }) => s.showBranding && (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: tk.muted }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke={s.accent} strokeWidth="2.4" strokeLinecap="round"/></svg>
    Verified by WeHearYou
  </div>
);

const ReviewCardW = ({ r, s, tk }) => (
  <div style={{ background: tk.card, border: `1px solid ${tk.line}`, borderRadius: s.radius, padding: 16, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {s.showAvatars && <Avatar name={r.name} size={34}/>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 620, color: tk.text }}>{r.name}</div>
        {s.showDates && <div style={{ fontSize: 11.5, color: tk.muted }}>{r.time}</div>}
      </div>
      {s.showSources && <span style={{ width: 18, height: 18, borderRadius: 5, background: (SOURCE_META[r.source]||{}).color, color: "#fff", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{(SOURCE_META[r.source]||{}).letter}</span>}
    </div>
    <Stars value={r.rating} size={15}/>
    <p style={{ fontSize: 13, lineHeight: 1.55, color: tk.sub, margin: 0,
      display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.text}</p>
  </div>
);

/* ---------- Wall of Love card system (varied, editorial) ---------- */
const QUOTE_FONT = '"Instrument Serif", Georgia, "Times New Roman", serif';

/* colored star row (for accent/hero cards where shared Stars' palette won't read) */
const WallStars = ({ value = 5, size = 15, color = "#fff", gap = 2 }) => (
  <span style={{ display: "inline-flex", gap }}>
    {[0,1,2,3,4].map(i => (
      <svg key={i} viewBox="0 0 24 24" width={size} height={size}>
        <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z"
          fill={i < Math.round(value) ? color : "color-mix(in srgb, " + color + " 32%, transparent)"}/>
      </svg>
    ))}
  </span>
);

/* rounded brand badge — the wall's source marker */
const SourceSquare = ({ source, size = 28 }) => {
  const m = SOURCE_META[source] || { color: "var(--ink-400)", letter: "?" };
  return (
    <span style={{ width: size, height: size, borderRadius: 8, flex: "none", background: m.color, color: "#fff",
      display: "grid", placeItems: "center", fontSize: size * 0.45, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{m.letter}</span>
  );
};

/* initials chip that reads on a colored background */
const HeroAvatar = ({ name, size = 38 }) => {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flex: "none", background: "rgba(255,255,255,.2)", color: "#fff",
      display: "grid", placeItems: "center", fontSize: size * 0.38, fontWeight: 680, border: "1px solid rgba(255,255,255,.28)" }}>{initials}</span>
  );
};

const WallCard = ({ r, s, tk, variant, pinned = false }) => {
  const subtitle = r.loc || r.source;
  const limit = s.reviewTextLimit || 280;
  const highlight = (s.highlights || []).find(h => h.reviewId === r.id);
  const bodyRaw = truncateText(r.text, limit);
  const body = highlight ? renderHighlighted(bodyRaw, highlight.phrase, variant === "hero" ? "#fff" : s.accent) : bodyRaw;
  const nameSize = (s.typeSize && s.typeSize.reviewerNames) || 13;

  if (variant === "hero") {
    return (
      <div className="wwall-card" style={{ position: "relative", background: s.accent, color: "#fff", borderRadius: s.radius, padding: dPad(s, 24),
        display: "flex", flexDirection: "column", gap: dPad(s, 18) }}>
        {pinned && <PinRibbon accent="rgba(255,255,255,.3)"/>}
        {s.showStarRatings && <WallStars value={r.rating} size={15} color="#fff"/>}
        <p style={{ fontFamily: QUOTE_FONT, fontSize: 27, lineHeight: 1.18, letterSpacing: ".005em", margin: 0, color: "#fff",
          display: s.cardHeights === "equal" ? "-webkit-box" : "block", WebkitLineClamp: s.cardHeights === "equal" ? 5 : "unset", WebkitBoxOrient: "vertical", overflow: s.cardHeights === "equal" ? "hidden" : "visible" }}>
          &ldquo;{body}&rdquo;
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: "auto" }}>
          {s.showAvatars && <HeroAvatar name={r.name} size={38}/>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: nameSize, fontWeight: 660 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>{subtitle}</div>
          </div>
          {s.showSources && <span style={{ width: 26, height: 26, borderRadius: 7, flex: "none", background: "rgba(255,255,255,.16)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{(SOURCE_META[r.source]||{}).letter}</span>}
        </div>
        {s.showOwnerResponses && r.rating >= 4 && <OwnerReply tk={{ text: "#fff", sub: "rgba(255,255,255,.82)" }} s={s}/>}
      </div>
    );
  }

  if (variant === "social") {
    return (
      <div className="wwall-card" style={{ position: "relative", ...cardChrome(s, tk), borderRadius: s.radius, padding: dPad(s, 20),
        display: "flex", flexDirection: "column", gap: 13 }}>
        {pinned && <PinRibbon accent={s.accent}/>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {s.showAvatars && <Avatar name={r.name} size={32}/>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: nameSize, fontWeight: 620, color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
              <VerifiedCheck accent={s.accent}/>
            </div>
            <div style={{ fontSize: 11.5, color: tk.muted, marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
              {!s.showSources ? subtitle : (SOURCE_META[r.source]||{}).label}
              {s.showDates && <><span style={{ opacity: .5 }}>&middot;</span>{r.time}</>}
            </div>
          </div>
          {s.showSources && <SourceSquare source={r.source} size={22}/>}
        </div>
        {s.showStarRatings && <Stars value={r.rating} size={13.5}/>}
        <p style={{ fontSize: (s.typeSize && s.typeSize.reviewText) || 13, lineHeight: 1.6, color: tk.sub, margin: 0, letterSpacing: ".003em",
          display: s.cardHeights === "equal" ? "-webkit-box" : "block", WebkitLineClamp: s.cardHeights === "equal" ? 4 : "unset", WebkitBoxOrient: "vertical", overflow: s.cardHeights === "equal" ? "hidden" : "visible" }}>{body}</p>
        {s.showOwnerResponses && r.rating >= 4 && <OwnerReply tk={tk} s={s}/>}
      </div>
    );
  }

  /* "quote" — editorial: stars, serif pull-quote, author footer */
  return (
    <div className="wwall-card" style={{ position: "relative", ...cardChrome(s, tk), borderRadius: s.radius, padding: dPad(s, 24),
      display: "flex", flexDirection: "column", gap: 18 }}>
      {pinned && <PinRibbon accent={s.accent}/>}
      {s.showStarRatings && <Stars value={r.rating} size={14}/>}
      <p style={{ fontFamily: QUOTE_FONT, fontSize: 22, lineHeight: 1.3, letterSpacing: ".003em", color: tk.text, margin: 0, fontWeight: 400,
        display: s.cardHeights === "equal" ? "-webkit-box" : "block", WebkitLineClamp: s.cardHeights === "equal" ? 4 : "unset", WebkitBoxOrient: "vertical", overflow: s.cardHeights === "equal" ? "hidden" : "visible" }}>
        {body}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${tk.line}` }}>
        {s.showAvatars && <Avatar name={r.name} size={34}/>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: nameSize, fontWeight: 620, color: tk.text }}>{r.name}</div>
          <div style={{ fontSize: 11.5, color: tk.muted, marginTop: 1 }}>{subtitle}</div>
        </div>
        {s.showSources && <SourceSquare source={r.source} size={22}/>}
      </div>
      {s.showOwnerResponses && r.rating >= 4 && <OwnerReply tk={tk} s={s}/>}
    </div>
  );
};

const WALL_CYCLE = ["quote", "social", "social", "hero", "quote", "social", "quote", "social", "quote"];
const wallVariant = (i, r) => {
  let v = WALL_CYCLE[i % WALL_CYCLE.length];
  if (v === "hero" && r.rating < 5) v = "quote";
  return v;
};

/* truncate review body to the configured character limit, on a word boundary */
const truncateText = (t, limit) => (!limit || t.length <= limit) ? t : t.slice(0, limit).replace(/\s+\S*$/, "") + "\u2026";

/* wrap a highlighted phrase (if present, case-sensitive match) in an accent mark */
const renderHighlighted = (text, phrase, accent) => {
  if (!phrase) return text;
  const i = text.indexOf(phrase);
  if (i === -1) return text;
  return [text.slice(0, i), <mark key="h" style={{ background: "color-mix(in srgb, " + accent + " 24%, transparent)", color: "inherit", borderRadius: 3, padding: "0 2px" }}>{phrase}</mark>, text.slice(i + phrase.length)];
};

/* short canned owner reply — demo content shown only when the toggle is on */
const OwnerReply = ({ tk, s }) => (
  <div style={{ marginTop: 4, padding: "10px 12px", borderRadius: 8, background: s.theme === "dark" ? "#1c1c22" : "var(--ink-50)", display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ fontSize: 11.5, fontWeight: 650, color: tk.text }}>Response from the owner</div>
    <p style={{ fontSize: 12.5, lineHeight: 1.5, color: tk.sub, margin: 0 }}>Thank you so much for taking the time to share this — it means a lot to our team!</p>
  </div>
);

/* quiet verified checkmark, replaces the noisy raw "✓" glyph */
const VerifiedCheck = ({ accent, size = 13 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flex: "none", background: accent, display: "grid", placeItems: "center" }}>
    <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none"><path d="M5 13l4.5 4.5L19 8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>
);

/* small pin ribbon shown on cards pinned near the top of the wall */
const PinRibbon = ({ accent }) => (
  <span style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: accent, color: "#fff", display: "grid", placeItems: "center" }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.5 6.5L20 10l-5 4 1.5 7-4.5-3.8L7.5 21 9 14l-5-4 6.5-1.5z" fill="#fff"/></svg>
  </span>
);

/* ---------- video testimonial card ---------- */
const VideoCardW = ({ v, s, tk, tall = false }) => (
  <div style={{ ...cardChrome(s, tk), borderRadius: s.radius, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
    <div style={{ position: "relative", aspectRatio: tall ? "9 / 12" : "4 / 3",
      background: `linear-gradient(135deg, color-mix(in srgb, ${s.accent} 30%, #1b1b22), #0f0f14)` }}>
      {/* play button */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <span style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill={s.accent}/></svg>
        </span>
      </div>
      {/* length pill */}
      <span style={{ position: "absolute", bottom: 9, right: 9, background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 5 }}>{v.length}</span>
      {/* video tag */}
      <span style={{ position: "absolute", top: 9, left: 9, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="13" height="12" rx="2" stroke="#fff" strokeWidth="2"/><path d="M16 10l5-3v10l-5-3" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
        Video
      </span>
    </div>
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <Stars value={v.rating} size={14}/>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: tk.text, margin: 0, fontWeight: 500 }}>&ldquo;{v.quote}&rdquo;</p>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 2 }}>
        {s.showAvatars && <Avatar name={v.name} size={28}/>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 620, color: tk.text }}>{v.name}</div>
          {s.showDates && <div style={{ fontSize: 11, color: tk.muted }}>{v.time}</div>}
        </div>
        {s.showSources && <span style={{ width: 16, height: 16, borderRadius: 4, background: (SOURCE_META[v.source]||{}).color, color: "#fff", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{(SOURCE_META[v.source]||{}).letter}</span>}
      </div>
    </div>
  </div>
);

/* ---------- AI review summary box — quiet editorial treatment, no tinted fill ---------- */
const AISummaryBox = ({ s, tk }) => (
  <div style={{ borderRadius: s.radius, padding: "18px 20px", marginBottom: 20, background: tk.card, border: `1px solid ${tk.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, flex: "none", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${s.accent} 14%, transparent)` }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.7 5L19 9.7 14 11l-2 5-2-5-5-1.3L10 8z" fill={s.accent}/></svg>
      </span>
      <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: ".07em", textTransform: "uppercase", color: tk.muted }}>AI Summary</span>
      <span style={{ marginLeft: "auto", fontSize: 11.5, color: tk.muted, whiteSpace: "nowrap" }}>Based on {AI_SUMMARY.count} reviews</span>
    </div>
    <p style={{ fontFamily: QUOTE_FONT, fontSize: 17, lineHeight: 1.45, color: tk.text, margin: 0, letterSpacing: ".003em" }}>{AI_SUMMARY.text}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
      {AI_SUMMARY.highlights.map(h => (
        <span key={h} style={{ fontSize: 11.5, fontWeight: 540, padding: "4px 11px", borderRadius: 999, color: tk.sub,
          background: "transparent", border: `1px solid ${tk.line}` }}>{h}</span>
      ))}
    </div>
  </div>
);

/* ---------- compact review card for the marquee (carousel type) ---------- */
const MarqueeCard = ({ it, s, tk }) => {
  const d = it.data;
  const text = it.kind === "video" ? d.quote : d.text;
  const subtitle = d.loc || (SOURCE_META[d.source] || {}).label || d.source || "";
  return (
    <div style={{ width: s.device === "mobile" ? 260 : 320, flex: "none", boxSizing: "border-box",
      ...cardChrome(s, tk), borderRadius: s.radius, padding: dPad(s, 18), display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {s.showAvatars && <Avatar name={d.name} size={38} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 660, color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
          <div style={{ fontSize: 12, color: tk.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        </div>
        <Stars value={d.rating} size={14} />
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: tk.sub, margin: 0, fontWeight: 500, textWrap: "pretty",
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>&ldquo;{text}&rdquo;</p>
      {s.showSources && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: (SOURCE_META[d.source] || {}).color, color: "#fff",
            display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{(SOURCE_META[d.source] || {}).letter}</span>
          {s.showDates && <span style={{ fontSize: 11, color: tk.muted }}>{d.time}</span>}
        </div>
      )}
    </div>
  );
};

/* one auto-scrolling row; renders the set twice for a seamless -50% loop */
const MarqueeRow = ({ items, s, tk, dir = "l", duration = 34, gap = 16 }) => {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="wmarq">
      <div className={`wmarq-track wmarq-track--${dir}`} style={{ gap, animationDuration: `${duration}s` }}>
        {loop.map((it, i) => <MarqueeCard key={it.kind + it.data.id + "-" + i} it={it} s={s} tk={tk} />)}
      </div>
    </div>
  );
};

/* split a pool into two staggered rows, cycling so each row is comfortably full */
const buildMarqueeRows = (pool) => {
  if (pool.length === 0) return [[], []];
  const min = 6;
  const filled = [];
  while (filled.length < Math.max(min, pool.length)) filled.push(...pool);
  const half = Math.ceil(filled.length / 2);
  const rowA = filled.slice(0, half);
  const rowB = filled.slice(half).concat(filled.slice(0, Math.max(0, half - (filled.length - half))));
  return [rowA, rowB.length ? rowB : rowA];
};

const WidgetPreviewInner = ({ s }) => {
  const tk = wTokens(s);
  const list = REVIEWS.filter(r => s.sources[r.source] && r.rating >= s.minRating);
  const shown = list.slice(0, s.maxReviews);
  const avg = 4.6, total = "1,284";

  const isWall = s.type === "grid";
  const Header = () => s.showHeader && (
    <div style={{ marginBottom: 18 }}>
      {isWall && (s.wallTitle || s.wallSubtitle) && (
        <div style={{ marginBottom: 14 }}>
          {s.wallTitle && <div style={{ fontSize: (s.typeSize && s.typeSize.headerTitle) || 20, fontWeight: 720, letterSpacing: "-.02em", color: tk.text }}>{s.wallTitle}</div>}
          {s.wallSubtitle && <div style={{ fontSize: 13.5, color: tk.sub, marginTop: 5 }}>{s.wallSubtitle}</div>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {(s.showAvgRating || s.showStarRatings) && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {s.showAvgRating && <span style={{ fontSize: 34, fontWeight: 720, letterSpacing: "-.03em", color: tk.text, fontFamily: "var(--font-mono)" }}>{avg}</span>}
            {s.showStarRatings && <Stars value={avg} size={18}/>}
          </div>
        )}
        {(s.showAvgRating || s.showStarRatings) && s.showReviewCount && <div style={{ height: 30, width: 1, background: tk.line }}/>}
        {s.showReviewCount && <div style={{ fontSize: 13, color: tk.sub }}>Based on <b style={{ color: tk.text }}>{total}</b> verified reviews</div>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {isWall && s.showNavArrows && (
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${tk.line}`, display: "grid", placeItems: "center", color: tk.muted }}><Icon name="chevDown" size={13} style={{ transform: "rotate(90deg)" }}/></span>
              <span style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${tk.line}`, display: "grid", placeItems: "center", color: tk.muted }}><Icon name="chevDown" size={13} style={{ transform: "rotate(-90deg)" }}/></span>
            </div>
          )}
          <VerifiedTag s={s} tk={tk}/>
        </div>
      </div>
    </div>
  );

  if (s.type === "floating") {
    return (
      <div style={{ position: "absolute", right: 22, bottom: 22, display: "flex", alignItems: "center", gap: 11,
        background: tk.card, border: `1px solid ${tk.line}`, borderRadius: 999, padding: "9px 16px 9px 11px", boxShadow: "0 12px 30px -8px rgba(0,0,0,.28)" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: s.accent, display: "grid", placeItems: "center", flex: "none" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)" }}>{avg}</span>
            <Stars value={avg} size={13}/>
          </div>
          <div style={{ fontSize: 11, color: tk.muted }}>{total} reviews</div>
        </div>
      </div>
    );
  }

  if (s.type === "badge") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, ...cardChrome(s, tk),
        borderRadius: s.radius, padding: "12px 18px" }}>
        <span style={{ fontSize: 26, fontWeight: 720, color: tk.text, fontFamily: "var(--font-mono)", letterSpacing: "-.02em" }}>{avg}</span>
        <div style={{ lineHeight: 1.3 }}>
          <Stars value={avg} size={16}/>
          <div style={{ fontSize: 11.5, color: tk.muted, marginTop: 2 }}>{total} reviews · Excellent</div>
        </div>
        {s.showBranding && <><div style={{ width: 1, height: 30, background: tk.line }}/><VerifiedTag s={s} tk={tk}/></>}
      </div>
    );
  }

  if (s.type === "cta") {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", ...cardChrome(s, tk), borderRadius: s.radius, padding: dPad(s, 26), textAlign: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, margin: "0 auto 14px", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${s.accent} 14%, ${tk.bg})`, color: s.accent }}>
          <Icon name="chat" size={24}/>
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 680, color: tk.text, letterSpacing: "-.02em" }}>{s.ctaTitle || "How was your visit?"}</h3>
        <p style={{ fontSize: 13.5, color: tk.sub, margin: "8px 0 18px", lineHeight: 1.5 }}>{s.ctaSubtitle || ""}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {Object.keys(s.sources).filter(k => s.sources[k]).map(src => (
            <button key={src} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${tk.line}`, background: tk.bg, color: tk.text,
              borderRadius: 8, padding: "9px 13px", fontSize: 13, fontWeight: 560, cursor: "pointer" }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: (SOURCE_META[src]||{}).color, color: "#fff", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{(SOURCE_META[src]||{}).letter}</span>
              {src}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><VerifiedTag s={s} tk={tk}/></div>
      </div>
    );
  }

  if (s.type === "single") {
    const useVideo = s.content === "videos";
    const v = VIDEOS[0];
    const r = REVIEWS.find(x => s.sources[x.source] && x.rating >= 5) || REVIEWS[0];
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {useVideo ? <VideoCardW v={v} s={s} tk={tk}/> : (
          <div style={{ ...cardChrome(s, tk), borderRadius: s.radius, padding: dPad(s, 44), textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            {s.showStarRatings && <Stars value={r.rating} size={16}/>}
            <p style={{ fontFamily: QUOTE_FONT, fontSize: 30, lineHeight: 1.32, letterSpacing: ".002em", color: tk.text, margin: 0, fontWeight: 400 }}>
              {r.text}
            </p>
            <div style={{ width: 30, height: 1, background: s.accent, opacity: .5 }}/>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {s.showAvatars && <Avatar name={r.name} size={44}/>}
              <div>
                <div style={{ fontSize: 14, fontWeight: 620, color: tk.text }}>{r.name}</div>
                <div style={{ fontSize: 12, color: tk.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  {(SOURCE_META[r.source]||{}).label}{s.showDates && ` · ${r.time}`}
                  {s.showSources && <SourceSquare source={r.source} size={17}/>}
                </div>
              </div>
            </div>
            {s.showBranding && <div style={{ marginTop: 4 }}><VerifiedTag s={s} tk={tk}/></div>}
          </div>
        )}
      </div>
    );
  }

  // carousel / grid (Wall of Love)
  const reviews = REVIEWS.filter(r => s.sources[r.source] && r.rating >= s.minRating);
  const videos = VIDEOS.filter(v => s.sources[v.source]);
  let items;
  if (s.content === "videos") items = videos.map(v => ({ kind: "video", data: v }));
  else if (s.content === "mixed") {
    const rs = reviews.map(r => ({ kind: "review", data: r }));
    const vs = videos.map(v => ({ kind: "video", data: v }));
    items = []; let ri = 0, vi = 0;
    while (ri < rs.length || vi < vs.length) {
      if (vi < vs.length) items.push(vs[vi++]);
      if (ri < rs.length) items.push(rs[ri++]);
      if (ri < rs.length) items.push(rs[ri++]);
    }
  } else items = reviews.map(r => ({ kind: "review", data: r }));
  /* spotlight + pinned reviews float to the front of the wall, ahead of the normal cycle */
  const applySpotlightPin = (arr) => {
    if (s.content === "videos" || s.type !== "grid") return arr;
    const spot = arr.find(it => it.kind === "review" && it.data.id === s.spotlightId);
    const pins = arr.filter(it => it.kind === "review" && (s.pinnedIds||[]).includes(it.data.id) && it.data.id !== s.spotlightId);
    const rest = arr.filter(it => !(it.kind === "review" && (it.data.id === s.spotlightId || (s.pinnedIds||[]).includes(it.data.id))));
    return [...(spot ? [spot] : []), ...pins, ...rest];
  };
  let fullItems = applySpotlightPin(items);
  items = fullItems.slice(0, s.maxReviews);
  const showSummary = s.aiSummary && s.content !== "videos";
  const [rowA, rowB] = buildMarqueeRows(fullItems);
  const colGap = dPad(s, 16);
  const wallEqual = s.type === "grid" && s.cardHeights === "equal";
  const nCols = s.columns === "auto" ? 3 : Number(s.columns);
  const colStyle = s.device === "mobile" ? (wallEqual ? { display: "grid", gridTemplateColumns: "1fr" } : { columns: "1" })
    : wallEqual ? { display: "grid", gridTemplateColumns: `repeat(${s.columns === "auto" ? Math.min(nCols,3) : nCols}, 1fr)`, alignItems: "stretch" }
    : s.columns === "auto" ? { columns: "262px" }
    : { columnCount: Number(s.columns) };
  const speedBase = SPEED_BASE[s.speed] || 40;

  return (
    <div>
      <Header/>
      {showSummary && <AISummaryBox s={s} tk={tk}/>}
      {s.type === "grid" ? (
        <>
        <div style={{ ...colStyle, columnGap: colGap, rowGap: wallEqual ? colGap : undefined }}>
          {items.map((it, i) => {
            const isSpot = it.kind === "review" && it.data.id === s.spotlightId;
            const isPin = it.kind === "review" && (s.pinnedIds||[]).includes(it.data.id) && !isSpot;
            const variant = isSpot ? "hero" : (s.wallStyle === "uniform" ? "social" : wallVariant(i, it.data));
            return (
              <div key={it.kind + it.data.id} style={wallEqual ? { minWidth: 0 } : { breakInside: "avoid", WebkitColumnBreakInside: "avoid", marginBottom: colGap }}>
                {it.kind === "video" ? <VideoCardW v={it.data} s={s} tk={tk}/> : <WallCard r={it.data} s={s} tk={tk} variant={variant} pinned={isPin}/>}
              </div>
            );
          })}
        </div>
        {(s.showWriteReviewLink || s.showPagination) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 26 }}>
            {s.showWriteReviewLink && <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize: 13.5, fontWeight: 600, color: s.accent }}>+ Write a review</a>}
            {s.showPagination && <button className="btn btn-secondary">Load more reviews</button>}
          </div>
        )}
        </>
      ) : fullItems.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MarqueeRow items={rowA} s={s} tk={tk} dir="l" duration={speedBase}/>
          {rowB.length > 0 && <MarqueeRow items={rowB} s={s} tk={tk} dir="r" duration={Math.round(speedBase * 1.22)}/>}
        </div>
      )}
      {fullItems.length === 0 && <div style={{ textAlign: "center", padding: 30, color: tk.muted, fontSize: 13 }}>No content matches these filters.</div>}
    </div>
  );
};

/* font + star-color wrapper applied to every widget type */
const WidgetPreview = (props) => (
  <div style={{ fontFamily: FONT_STACKS[props.s.font] || FONT_STACKS.sans, "--star": starColorOf(props.s) }}>
    <WidgetPreviewInner {...props}/>
  </div>
);

/* ---------- mock site frame for the preview ---------- */
const SiteFrame = ({ device, children }) => {
  const mobile = device === "mobile";
  return (
    <div style={{ width: mobile ? 390 : "100%", maxWidth: mobile ? 390 : "none", margin: "0 auto",
      borderRadius: 14, overflow: "hidden", border: "1px solid var(--ink-200)", background: "#fff", boxShadow: "var(--shadow-lg)" }}>
      {/* faux browser bar */}
      <div style={{ height: 38, background: "var(--ink-50)", borderBottom: "1px solid var(--ink-200)", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f0625a" }}/>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f5bd4f" }}/>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#62c554" }}/>
        <div style={{ marginLeft: 10, flex: 1, maxWidth: 280, height: 22, borderRadius: 6, background: "var(--white)", border: "1px solid var(--ink-200)",
          display: "flex", alignItems: "center", gap: 6, padding: "0 9px", fontSize: 11, color: "var(--ink-400)" }}>
          <Icon name="plug" size={11}/>brightsmile.com
        </div>
      </div>
      {children}
    </div>
  );
};

/* ---------- embed code ---------- */
const EmbedCode = ({ s }) => {
  const [copied, setCopied] = useStateW(false);
  const code = `<!-- WeHearYou ${s.type} widget -->
<div
  data-wehearyou="wgt_8f2a3c"
  data-type="${s.type}"
  data-theme="${s.theme}"
  data-min-rating="${s.minRating}">
</div>
<script async src="https://cdn.wehearyou.com/v1/embed.js"></script>`;
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderBottom: "1px solid var(--ink-200)" }}>
        <Icon name="code" size={17} style={{ color: "var(--accent)" }}/>
        <span style={{ fontSize: 14, fontWeight: 620 }}>Embed code</span>
        <span className="badge badge-neutral" style={{ marginLeft: 4 }}>Paste before &lt;/body&gt;</span>
        <button className={`btn btn-sm ${copied ? "btn-soft" : "btn-secondary"}`} style={{ marginLeft: "auto" }} onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={14}/>{copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px 18px", background: "#0f0f13", color: "#e4e4e7", fontSize: 12.5, lineHeight: 1.7,
        fontFamily: "var(--font-mono)", overflowX: "auto" }}>
{code.split("\n").map((ln,i) => {
  const re = /(<!--[\s\S]*?-->)|("[^"]*")|(\bdata-[a-z-]+)/g;
  const out = []; let last = 0, m;
  while ((m = re.exec(ln))) {
    if (m.index > last) out.push({ t: ln.slice(last, m.index) });
    out.push({ t: m[0], c: m[1] ? "#52525b" : m[2] ? "#86efac" : "#a5b4fc" });
    last = re.lastIndex;
  }
  if (last < ln.length) out.push({ t: ln.slice(last) });
  return (
    <div key={i}><span style={{ color: "#3f3f46", userSelect: "none", display: "inline-block", width: 22 }}>{i+1}</span>
    {out.map((tk,j) => <span key={j} style={tk.c ? { color: tk.c } : undefined}>{tk.t}</span>)}</div>
  );
})}
      </pre>
    </div>
  );
};

/* ================= Widget Studio ================= */
const WIDGET_TYPES = [
  { id: "grid", label: "Wall of Love", icon: "grid", desc: "Masonry of reviews & video" },
  { id: "carousel", label: "Review marquee", icon: "layers", desc: "Auto-scrolling rows of reviews" },
  { id: "single", label: "Single testimonial", icon: "film", desc: "One video or text quote" },
  { id: "badge", label: "Rating badge", icon: "star", desc: "Compact score + stars" },
  { id: "floating", label: "Floating badge", icon: "chat", desc: "Sticky corner pill" },
  { id: "cta", label: "Collect reviews", icon: "send", desc: "Ask customers to review" },
];

const WIDGET_DEFAULTS = {
  type: "grid", theme: "light", accent: "#37aeb7", radius: 12, device: "desktop",
  font: "sans", starColor: "gold", cardStyle: "border", density: "cozy",
  columns: "auto", wallStyle: "varied", speed: "normal", cardHeights: "equal",
  content: "mixed", aiSummary: true,
  sources: { Google: true, Facebook: true, Yelp: true, Trustpilot: true },
  minRating: 4, maxReviews: 9,
  showAvatars: true, showDates: true, showSources: true, showHeader: true, showBranding: true,
  location: "Bright Smile Dental — Downtown",
  wallTitle: "Trusted by happy customers", wallSubtitle: "See what our community is saying.",
  showAvgRating: true, showReviewCount: true, showStarRatings: true, showOwnerResponses: false,
  showWriteReviewLink: true, showNavArrows: true, showPagination: true,
  typeSize: { reviewText: 14, reviewerNames: 13, headerTitle: 20, aiSummaryText: 14 },
  reviewTextLimit: 280,
  spotlightId: null, pinnedIds: [], highlights: [], active: true,
  ctaTitle: "How was your visit?",
  ctaSubtitle: "Your feedback helps others find great care. It only takes a minute.",
};

const WidgetStudio = ({ initial, name: initialName = "", isNew = true, onBack, onSave }) => {
  const [s, setS] = useStateW({ ...WIDGET_DEFAULTS, ...(initial || {}) });
  const [name, setName] = useStateW(initialName);
  const [saved, setSaved] = useStateW(false);
  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  const save = () => {
    const finalName = (name || "").trim() || "Untitled widget";
    onSave && onSave({ name: finalName, settings: s });
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  };
  const setSrc = (k, v) => setS(p => ({ ...p, sources: { ...p.sources, [k]: v } }));
  const setDeep = (k, v) => setS(p => ({ ...p, [k]: v }));
  const tk = wTokens(s);
  const isOverlay = s.type === "floating";

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div style={{ minWidth: 0 }}>
          <button onClick={() => onBack && onBack()} className="tap focus-ring"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer",
              color: "var(--ink-500)", fontSize: 12.5, fontWeight: 560, padding: "2px 0", marginBottom: 8 }}>
            <Icon name="chevDown" size={15} style={{ transform: "rotate(90deg)" }}/>All widgets
          </button>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{isNew ? "New widget" : "Editing widget"}</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name this widget…"
            className="focus-ring" spellCheck={false}
            style={{ display: "block", border: "1px solid transparent", background: "transparent", outline: "none",
              fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", color: "var(--ink-900)", padding: "2px 8px", margin: "0 0 0 -8px",
              borderRadius: "var(--r-sm)", width: "min(440px, 80vw)" }}
            onFocus={e => { e.target.style.borderColor = "var(--ink-200)"; e.target.style.background = "var(--white)"; }}
            onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}/>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 6 }}>Design a review widget for your site, then copy the embed code. Changes preview live.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary"><Icon name="eye" size={16}/>Preview page</button>
          <button className={`btn ${saved ? "btn-soft" : "btn-primary"}`} onClick={save}>
            <Icon name={saved ? "check" : "check"} size={16}/>{saved ? "Saved" : (isNew ? "Save widget" : "Save changes")}
          </button>
        </div>
      </div>

      {/* type selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: "var(--gutter)" }} className="wtype-grid">
        {WIDGET_TYPES.map(w => {
          const active = s.type === w.id;
          return (
            <button key={w.id} onClick={() => set("type", w.id)} className="tap focus-ring"
              style={{ textAlign: "left", cursor: "pointer", padding: 15, borderRadius: "var(--r-lg)",
                border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
                background: active ? "var(--accent-softer)" : "var(--white)", boxShadow: active ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", marginBottom: 11,
                background: active ? "var(--accent)" : "var(--ink-100)", color: active ? "#fff" : "var(--ink-500)" }}>
                <Icon name={w.icon} size={18}/>
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 620 }}>{w.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 2 }}>{w.desc}</div>
            </button>
          );
        })}
      </div>

      {/* main: controls + preview */}
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: "var(--gutter)", alignItems: "start" }} className="wstudio-grid">
        {/* CONTROLS */}
        {s.type === "grid" ? (
          <WallCustomizePanel s={s} set={set} setSrc={setSrc} setDeep={setDeep}/>
        ) : (
        <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: "var(--gutter)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="sliders" size={16} style={{ color: "var(--accent)" }}/>
            <span style={{ fontSize: 14, fontWeight: 640 }}>Customize</span>
          </div>

          {(s.type==="grid"||s.type==="carousel"||s.type==="single") && (
            <Field label="Content">
              <Segmented value={s.content==='mixed'&&s.type==='single'?'reviews':s.content} onChange={v => set("content", v)}
                options={s.type==="single"
                  ? [{value:"reviews",label:"Text"},{value:"videos",label:"Video"}]
                  : [{value:"reviews",label:"Reviews"},{value:"videos",label:"Videos"},{value:"mixed",label:"Mixed"}]}/>
            </Field>
          )}
          <Field label="Appearance">
            <Segmented value={s.theme} onChange={v => set("theme", v)} options={[{value:"light",label:"Light",icon:"sun"},{value:"dark",label:"Dark",icon:"moon"}]}/>
          </Field>
          <Field label="Accent">
            <Swatches value={s.accent} onChange={v => set("accent", v)} options={["#37aeb7","#4f46e5","#2563eb","#7c3aed","#e0533d","#18181b"]}/>
          </Field>
          <Field label="Corner radius" hint={`${s.radius}px`}>
            <Slider value={s.radius} min={0} max={22} onChange={v => set("radius", v)}/>
          </Field>

          <div className="hr"/>
          <div className="eyebrow">Typography &amp; style</div>

          <Field label="Font">
            <Segmented value={s.font} onChange={v => set("font", v)} options={FONT_OPTS}/>
          </Field>
          <Field label="Star color">
            <Segmented value={s.starColor} onChange={v => set("starColor", v)}
              options={[{value:"gold",label:"Gold"},{value:"accent",label:"Accent"},{value:"dark",label:"Ink"}]}/>
          </Field>
          <Field label="Card style">
            <Segmented value={s.cardStyle} onChange={v => set("cardStyle", v)}
              options={[{value:"border",label:"Bordered"},{value:"shadow",label:"Shadow"},{value:"soft",label:"Soft"}]}/>
          </Field>
          <Field label="Density">
            <Segmented value={s.density} onChange={v => set("density", v)}
              options={[{value:"cozy",label:"Cozy"},{value:"compact",label:"Compact"}]}/>
          </Field>

          {s.type === "grid" && (
            <>
              <Field label="Columns">
                <Segmented value={s.columns} onChange={v => set("columns", v)}
                  options={[{value:"auto",label:"Auto"},{value:"2",label:"2"},{value:"3",label:"3"}]}/>
              </Field>
              <Field label="Wall layout">
                <Segmented value={s.wallStyle} onChange={v => set("wallStyle", v)}
                  options={[{value:"varied",label:"Varied"},{value:"uniform",label:"Uniform"}]}/>
              </Field>
            </>
          )}
          {s.type === "carousel" && (
            <Field label="Scroll speed">
              <Segmented value={s.speed} onChange={v => set("speed", v)}
                options={[{value:"slow",label:"Slow"},{value:"normal",label:"Normal"},{value:"fast",label:"Fast"}]}/>
            </Field>
          )}
          {s.type === "cta" && (
            <>
              <Field label="Heading">
                <input className="input" value={s.ctaTitle} onChange={e => set("ctaTitle", e.target.value)} placeholder="How was your visit?" style={{ width: "100%" }}/>
              </Field>
              <Field label="Subtext">
                <textarea className="input" value={s.ctaSubtitle} onChange={e => set("ctaSubtitle", e.target.value)} rows={2}
                  placeholder="A short prompt…" style={{ width: "100%", height: "auto", padding: "9px 12px", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}/>
              </Field>
            </>
          )}

          <div className="hr"/>

          <Field label="Sources">
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {Object.keys(s.sources).map(src => (
                <div key={src} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: (SOURCE_META[src]||{}).color, color: "#fff", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)", flex: "none" }}>{(SOURCE_META[src]||{}).letter}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-700)", flex: 1 }}>{src}</span>
                  <Toggle checked={s.sources[src]} onChange={v => setSrc(src, v)}/>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Minimum rating" hint={`${s.minRating}★ and up`}>
            <Slider value={s.minRating} min={1} max={5} onChange={v => set("minRating", v)}/>
          </Field>
          {(s.type === "carousel" || s.type === "grid") && (
            <Field label="Max reviews shown" hint={`${s.maxReviews}`}>
              <Slider value={s.maxReviews} min={3} max={12} onChange={v => set("maxReviews", v)}/>
            </Field>
          )}

          <div className="hr"/>

          <Field label="Display">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(s.type==="carousel"||s.type==="grid") && s.content!=="videos" && <Toggle checked={s.aiSummary} onChange={v => set("aiSummary", v)} label="AI review summary"/>}
              {(s.type==="carousel"||s.type==="grid") && <Toggle checked={s.showHeader} onChange={v => set("showHeader", v)} label="Summary header"/>}
              {(s.type=="carousel"||s.type==="grid") && <Toggle checked={s.showAvatars} onChange={v => set("showAvatars", v)} label="Reviewer avatars"/>}
              {(s.type==="carousel"||s.type==="grid") && <Toggle checked={s.showDates} onChange={v => set("showDates", v)} label="Review dates"/>}
              {(s.type==="carousel"||s.type==="grid") && <Toggle checked={s.showSources} onChange={v => set("showSources", v)} label="Source logos"/>}
              <Toggle checked={s.showBranding} onChange={v => set("showBranding", v)} label="“Verified by WeHearYou”"/>
            </div>
          </Field>
        </div>
        )}

        {/* PREVIEW */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--ink-200)" }}>
              <span className="badge badge-success"><span style={{width:6,height:6,borderRadius:"50%",background:"var(--success)"}}/>Live preview</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-400)" }}>Updates as you edit</span>
              <div style={{ marginLeft: "auto" }}>
                <Segmented value={s.device} onChange={v => set("device", v)} options={[{value:"desktop",label:"",icon:"monitor"},{value:"mobile",label:"",icon:"phone"}]}/>
              </div>
            </div>
            <div style={{ padding: 28, background: "repeating-linear-gradient(45deg, var(--ink-50), var(--ink-50) 10px, var(--page) 10px, var(--page) 20px)" }}>
              <SiteFrame device={s.device}>
                <div style={{ position: "relative", background: tk.bg, minHeight: 320 }}>
                  {/* faux site content */}
                  <div style={{ padding: s.device==="mobile" ? "20px 16px" : "26px 30px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: s.accent }}/>
                        <span style={{ fontWeight: 700, fontSize: 15, color: tk.text }}>Bright Smile</span>
                      </div>
                      {s.device==="desktop" && <div style={{ display: "flex", gap: 16, fontSize: 13, color: tk.sub }}><span>Services</span><span>About</span><span>Book</span></div>}
                    </div>
                    {!isOverlay && s.type!=="badge" && s.type!=="cta" && s.type!=="grid" && (
                      <div style={{ marginBottom: 22 }}>
                        <div style={{ fontSize: s.device==="mobile"?22:30, fontWeight: 720, letterSpacing: "-.03em", color: tk.text, maxWidth: 440 }}>Trusted by thousands of happy patients</div>
                        <div style={{ fontSize: 14, color: tk.sub, marginTop: 8 }}>See what our community is saying.</div>
                      </div>
                    )}
                    <WidgetPreview s={s}/>
                  </div>
                </div>
              </SiteFrame>
            </div>
          </div>

          <EmbedCode s={s}/>
        </div>
      </div>
    </div>
  );
};

/* ================= Widgets index (list + empty state) ================= */
const WTYPE_LABEL = Object.fromEntries(WIDGET_TYPES.map(w => [w.id, w]));
const WIDGETS_KEY = "wehearyou_widgets_v1";

const loadWidgets = () => {
  try { return JSON.parse(localStorage.getItem(WIDGETS_KEY) || "[]"); } catch (e) { return []; }
};
const saveWidgets = (list) => {
  try { localStorage.setItem(WIDGETS_KEY, JSON.stringify(list)); } catch (e) {}
};
const uid = () => "wgt_" + Math.random().toString(36).slice(2, 8);
const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* small live thumbnail of a widget on a faux page */
const WidgetThumb = ({ settings }) => {
  const s = { ...WIDGET_DEFAULTS, ...settings };
  const tk = wTokens(s);
  return (
    <div style={{ height: 150, overflow: "hidden", position: "relative", background: tk.bg,
      borderBottom: "1px solid var(--ink-200)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 720, transformOrigin: "top left", transform: "scale(.52)", padding: 18, pointerEvents: "none" }}>
        <WidgetPreview s={{ ...s, device: "desktop", maxReviews: Math.min(s.maxReviews, 3) }}/>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, color-mix(in srgb, " + tk.bg + " 92%, transparent))" }}/>
    </div>
  );
};

const WidgetCard = ({ w, onEdit, onDuplicate, onDelete }) => {
  const [menu, setMenu] = useStateW(false);
  const ref = React.useRef(null);
  useEffectW(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const s = { ...WIDGET_DEFAULTS, ...w.settings };
  const meta = WTYPE_LABEL[s.type] || WIDGET_TYPES[0];
  const srcCount = Object.values(s.sources || {}).filter(Boolean).length;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <button onClick={() => onEdit(w)} className="tap" style={{ display: "block", border: 0, padding: 0, cursor: "pointer", background: "transparent", textAlign: "left" }}>
        <WidgetThumb settings={w.settings}/>
      </button>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
            <Icon name={meta.icon} size={17}/>
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 640, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 1 }}>{meta.label}</div>
          </div>
          <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setMenu(m => !m)} className="btn btn-ghost btn-icon btn-sm" title="More" style={{ width: 30, height: 30 }}>
              <Icon name="dots" size={16}/>
            </button>
            {menu && (
              <div className="card" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, width: 168, padding: 5, boxShadow: "var(--shadow-pop)", zIndex: 40, animation: "pop .14s ease both" }}>
                {[
                  { label: "Edit", icon: "sliders", fn: () => onEdit(w) },
                  { label: "Duplicate", icon: "copy", fn: () => onDuplicate(w) },
                  { label: "Delete", icon: "trash", fn: () => onDelete(w), danger: true },
                ].map(a => (
                  <button key={a.label} onClick={() => { setMenu(false); a.fn(); }} className="tap"
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer",
                      background: "transparent", textAlign: "left", fontSize: 13, fontWeight: 520, color: a.danger ? "var(--danger)" : "var(--ink-700)" }}>
                    <Icon name={a.icon} size={15}/>{a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span className="badge badge-neutral" style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{s.theme}</span>
          <span className="badge badge-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.accent }}/>Accent
          </span>
          <span className="badge badge-neutral" style={{ whiteSpace: "nowrap" }}>{srcCount} {srcCount === 1 ? "source" : "sources"}</span>
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, paddingTop: 4, borderTop: "1px solid var(--ink-100)" }}>
          <span className="badge badge-success"><span className="dot" style={{ background: "var(--success)" }}/>Live</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-400)", marginLeft: "auto" }}>Edited {fmtDate(w.updated)}</span>
        </div>
      </div>
    </div>
  );
};

const WidgetsEmpty = ({ onCreate }) => (
  <div style={{ display: "grid", placeItems: "center", minHeight: "62vh" }}>
    <div style={{ textAlign: "center", maxWidth: 460 }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, margin: "0 auto 20px", display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)", boxShadow: "var(--shadow-sm)" }}>
        <Icon name="widget" size={32}/>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 680, letterSpacing: "-.025em" }}>No widgets yet</h2>
      <p style={{ fontSize: 14, color: "var(--ink-500)", marginTop: 9, lineHeight: 1.6 }}>
        Widgets embed your reviews, ratings, and video testimonials anywhere on your site. Create your first one — pick a style, customize it, and copy the embed code.
      </p>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
        <button className="btn btn-primary" onClick={onCreate}><Icon name="plus" size={16}/>Create a widget</button>
      </div>
      {/* type hints */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 28 }}>
        {WIDGET_TYPES.map(w => (
          <span key={w.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-500)",
            border: "1px solid var(--ink-200)", background: "var(--white)", borderRadius: 999, padding: "6px 12px", boxShadow: "var(--shadow-xs)" }}>
            <Icon name={w.icon} size={14} style={{ color: "var(--accent)" }}/>{w.label}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const WidgetsPage = () => {
  const [list, setList] = useStateW(loadWidgets);
  const [view, setView] = useStateW({ mode: "list" }); // {mode:"list"} | {mode:"new"} | {mode:"edit", id}
  useEffectW(() => { saveWidgets(list); }, [list]);

  const editing = view.mode === "edit" ? list.find(w => w.id === view.id) : null;

  const handleSave = ({ name, settings }) => {
    const now = Date.now();
    if (view.mode === "edit" && editing) {
      setList(l => l.map(w => w.id === editing.id ? { ...w, name, settings, updated: now } : w));
    }
  };

  const handleSaveNew = ({ name, settings }) => {
    const now = Date.now();
    const id = uid();
    setList(l => [{ id, name, settings, created: now, updated: now }, ...l]);
    setView({ mode: "edit", id });
  };

  const duplicate = (w) => {
    const now = Date.now();
    setList(l => [{ id: uid(), name: w.name + " copy", settings: w.settings, created: now, updated: now }, ...l]);
  };
  const remove = (w) => {
    if (!window.confirm(`Delete \u201c${w.name}\u201d? This can\u2019t be undone.`)) return;
    setList(l => l.filter(x => x.id !== w.id));
  };

  if (view.mode === "new") {
    return <WidgetStudio isNew name="" initial={null} onBack={() => setView({ mode: "list" })} onSave={handleSaveNew}/>;
  }
  if (view.mode === "edit" && editing) {
    return <WidgetStudio isNew={false} name={editing.name} initial={editing.settings} onBack={() => setView({ mode: "list" })} onSave={handleSave}/>;
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Widgets</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Your widgets</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            {list.length === 0 ? "Embeddable review displays for your site." : `${list.length} widget${list.length === 1 ? "" : "s"} \u00b7 embed reviews anywhere on your site.`}
          </p>
        </div>
        {list.length > 0 && (
          <button className="btn btn-primary" onClick={() => setView({ mode: "new" })}><Icon name="plus" size={16}/>New widget</button>
        )}
      </div>

      {list.length === 0 ? (
        <WidgetsEmpty onCreate={() => setView({ mode: "new" })}/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "var(--gutter)" }}>
          {list.map(w => (
            <WidgetCard key={w.id} w={w}
              onEdit={(ww) => setView({ mode: "edit", id: ww.id })}
              onDuplicate={duplicate} onDelete={remove}/>
          ))}
          {/* add-new tile */}
          <button onClick={() => setView({ mode: "new" })} className="tap focus-ring"
            style={{ minHeight: 240, border: "1.5px dashed var(--ink-300)", borderRadius: "var(--r-lg)", background: "var(--white)",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-500)" }}>
            <span style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
              <Icon name="plus" size={22}/>
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 580 }}>New widget</span>
          </button>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { WidgetsPage, WidgetStudio, Field, Segmented, Toggle, Slider, Swatches,
  WidgetPreview, EmbedCode, SiteFrame, wTokens, cardChrome, dPad, FONT_STACKS, FONT_OPTS,
  starColorOf, WIDGET_DEFAULTS, WIDGET_TYPES });
