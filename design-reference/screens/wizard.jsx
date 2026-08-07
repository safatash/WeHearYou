/* WeHearYou — Campaign Wizard / Funnel Builder (/campaign-wizard) */

const { useState: useStateZ, useEffect: useEffectZ } = React;

const STEPS = [
  { id: "locations",  label: "Locations",  sub: "Where it runs", icon: "pin" },
  { id: "appearance", label: "Appearance", sub: "Funnel page", icon: "palette" },
  { id: "channels",   label: "Channels",   sub: "Where reviews go", icon: "star" },
  { id: "funnel",     label: "Funnel",     sub: "Routing logic", icon: "sliders" },
  { id: "message",    label: "Message",    sub: "The ask", icon: "chat" },
  { id: "review",     label: "Review",     sub: "Launch", icon: "check" },
];

const RATING_STYLES = [
  { id: "stars",  label: "Stars" },
  { id: "faces",  label: "Faces" },
  { id: "thumbs", label: "Thumbs" },
];

/* Routing vocabulary adapts to the chosen rating style.
   gateThreshold stays a number under the hood; these map it to the right words. */
const STYLE_ROUTING = {
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
    options: null, // binary — no threshold choice
    hint: () => "👍 goes public · 👎 stays private",
    above: () => "👍 thumbs up",
    below: () => "👎 thumbs down",
    summary: () => "👍 public",
    rateSub: "Customer taps thumbs up or down",
    defaultT: 5,
  },
};
const routingFor = (style) => STYLE_ROUTING[style] || STYLE_ROUTING.stars;

const DEFAULT_MSG = {
  sms: "Hi {first}, thanks for visiting Bright Smile Dental! We'd love your quick feedback — it takes 30 seconds: {link}",
  email: "We hope your visit went well! Your feedback helps us improve and helps others find great care. Tap below to share your experience — it only takes a moment.",
};

/* ============ Step rail ============ */
const StepRail = ({ step, setStep, maxReached }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {STEPS.map((s, i) => {
      const active = i === step;
      const done = i < maxReached;
      const reachable = i <= maxReached;
      return (
        <button key={s.id} disabled={!reachable} onClick={() => reachable && setStep(i)}
          className="tap" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--r-md)",
            border: 0, cursor: reachable ? "pointer" : "default", textAlign: "left",
            background: active ? "var(--accent-soft)" : "transparent", opacity: reachable ? 1 : 0.45 }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
            fontSize: 12.5, fontWeight: 680, fontFamily: "var(--font-mono)",
            background: active ? "var(--accent)" : done ? "var(--success-soft)" : "var(--ink-100)",
            color: active ? "#fff" : done ? "var(--success)" : "var(--ink-500)",
            border: active ? "0" : done ? "1px solid color-mix(in srgb, var(--success) 25%, #fff)" : "1px solid var(--ink-200)",
            transition: "all .16s" }}>
            {done ? <Icon name="check" size={15}/> : i + 1}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: active ? 640 : 560, color: active ? "var(--accent-strong)" : "var(--ink-800)" }}>{s.label}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{s.sub}</span>
          </span>
        </button>
      );
    })}
  </div>
);

/* ============ STEP 1 — Locations ============ */
const StepLocations = ({ cfg, set }) => {
  const toggle = (id) => {
    if (id === "all") { set("locations", cfg.locations.length === 3 ? [] : ["dt","wp","nb"]); return; }
    set("locations", cfg.locations.includes(id) ? cfg.locations.filter(x => x !== id) : [...cfg.locations, id]);
  };
  const real = LOCATIONS.filter(l => l.id !== "all");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Field label="Campaign name">
        <input className="input focus-ring" value={cfg.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Post-visit review request"/>
      </Field>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" }}>Locations</span>
          <button className="btn btn-ghost btn-sm" onClick={() => toggle("all")}>{cfg.locations.length === 3 ? "Clear all" : "Select all"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {real.map(l => {
            const on = cfg.locations.includes(l.id);
            return (
              <button key={l.id} onClick={() => toggle(l.id)} className="tap focus-ring"
                style={{ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left",
                  border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)",
                  boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
                  background: on ? "var(--accent)" : "var(--ink-100)", color: on ? "#fff" : "var(--ink-500)" }}><Icon name="pin" size={18}/></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 620 }}>{l.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ink-400)" }} className="tnum">{l.area} · {l.rating}★ · {l.reviews.toLocaleString()} reviews</span>
                </span>
                {l.status === "attention" && <span className="badge badge-warning">Needs reviews</span>}
                <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
                  border: on ? "0" : "1.5px solid var(--ink-300)", background: on ? "var(--accent)" : "transparent", color: "#fff" }}>
                  {on && <Icon name="check" size={14}/>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============ STEP — Appearance (rating style + copy) ============ */
const RatingGlyph = ({ id, big }) => {
  const sz = big ? 34 : 22;
  const base = { lineHeight: 1, whiteSpace: "nowrap" };
  if (id === "faces") return <span style={{ ...base, fontSize: sz, letterSpacing: big ? 6 : 3 }}>😞 😐 😊</span>;
  if (id === "thumbs") return <span style={{ ...base, fontSize: sz, letterSpacing: big ? 8 : 5 }}>👎 👍</span>;
  return <span style={{ ...base, fontSize: sz, letterSpacing: big ? 4 : 2, color: "var(--star)" }}>★★★★★</span>;
};

const StepAppearance = ({ cfg, set }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <Field label="Rating style">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {RATING_STYLES.map(o => {
          const on = cfg.ratingStyle === o.id;
          return (
            <button key={o.id} onClick={() => set("ratingStyle", o.id)} className="tap focus-ring"
              style={{ cursor: "pointer", padding: "24px 10px 14px", borderRadius: "var(--r-lg)", textAlign: "center",
                border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
                background: on ? "var(--accent-softer)" : "var(--white)",
                boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)" }}>
              <div style={{ height: 30, display: "grid", placeItems: "center", marginBottom: 12 }}><RatingGlyph id={o.id}/></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: on ? "var(--accent-strong)" : "var(--ink-700)" }}>{o.label}</div>
            </button>
          );
        })}
      </div>
    </Field>
    <Field label="Headline">
      <input className="input focus-ring" value={cfg.headline} onChange={e => set("headline", e.target.value)} placeholder="How was your experience?"/>
    </Field>
    <Field label="Subheading">
      <textarea className="input focus-ring" rows={3} value={cfg.subheading} onChange={e => set("subheading", e.target.value)}
        style={{ height: "auto", padding: "11px 12px", resize: "vertical", lineHeight: 1.55 }}/>
    </Field>
  </div>
);

/* ============ STEP 2 — Channels ============ */
const StepChannels = ({ cfg, set }) => {
  const setCh = (k, v) => set("channels", { ...cfg.channels, [k]: v });
  const META = {
    WeHearYou: { desc: "Public reviews and private feedback on your WeHearYou profile", first: true },
    Google: { desc: "Public reviews on Google Business Profile", rec: true },
    Facebook: { desc: "Recommendations on your Facebook page" },
    Yelp: { desc: "Yelp does not allow direct review links", warn: "Solicitation discouraged" },
    Trustpilot: { desc: "Verified reviews on Trustpilot" },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 13.5, color: "var(--ink-500)", lineHeight: 1.55, margin: 0 }}>
        Pick where happy customers leave a public review. <b style={{ color: "var(--ink-700)" }}>WeHearYou</b> is built in — it captures both public reviews and the private feedback from unhappy customers.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.keys(SOURCE_META).map(src => {
          const on = cfg.channels[src];
          const m = META[src] || {};
          const isPrimary = cfg.primaryChannel === src;
          return (
            <div key={src} className="tap" style={{ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: "var(--r-md)",
              border: on ? "1.5px solid var(--accent-border)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)" }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", color: "#fff",
                background: SOURCE_META[src].color, fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16 }}>{SOURCE_META[src].letter}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 620 }}>{src}</span>
                  {m.first && <span className="badge badge-accent" style={{ height: 19, fontSize: 10.5 }}>First-party</span>}
                  {m.rec && <span className="badge badge-neutral" style={{ height: 19, fontSize: 10.5 }}>Recommended</span>}
                  {on && isPrimary && <span className="badge badge-success" style={{ height: 19, fontSize: 10.5 }}>Primary</span>}
                  {m.first && on && <span className="badge badge-neutral" style={{ height: 19, fontSize: 10.5 }} title="Always collects feedback">Both ratings</span>}
                </div>
                <div style={{ fontSize: 12, color: m.warn ? "var(--warning)" : "var(--ink-400)", marginTop: 2 }}>{m.warn || m.desc}</div>
              </div>
              {on && !isPrimary && <button className="btn btn-ghost btn-sm" onClick={() => set("primaryChannel", src)}>Make primary</button>}
              <Toggle checked={on} onChange={v => { setCh(src, v); if (v && !cfg.primaryChannel) set("primaryChannel", src); }}/>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============ STEP 3 — Funnel flow builder ============ */
const FlowNode = ({ icon, title, sub, tone = "neutral", children, accent, compact }) => {
  const tones = {
    neutral: { bg: "var(--white)", bd: "var(--ink-200)", ic: "var(--ink-100)", icFg: "var(--ink-600)" },
    accent:  { bg: "var(--accent-softer)", bd: "var(--accent-border)", ic: "var(--accent)", icFg: "#fff" },
    success: { bg: "var(--success-soft)", bd: "color-mix(in srgb, var(--success) 25%, #fff)", ic: "var(--success)", icFg: "#fff" },
    danger:  { bg: "var(--danger-soft)", bd: "color-mix(in srgb, var(--danger) 25%, #fff)", ic: "var(--danger)", icFg: "#fff" },
  }[tone];
  return (
    <div style={{ background: tones.bg, border: `1.5px solid ${tones.bd}`, borderRadius: "var(--r-lg)", padding: compact ? "11px 13px" : 15,
      boxShadow: "var(--shadow-sm)", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: tones.ic, color: tones.icFg }}>
          <Icon name={icon} size={17}/>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 640 }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {children && <div style={{ marginTop: 11 }}>{children}</div>}
    </div>
  );
};

const Connector = ({ h = 26 }) => (
  <div style={{ width: 2, height: h, background: "var(--ink-200)", margin: "0 auto" }}/>
);

/* ---- faces threshold picker: split-group visual, used only for the "faces" rating style ---- */
const FACE_ORDER = ["😞", "😐", "😊"];
const publicFacesFor = (t) => (t >= 5 ? ["😊"] : ["😐", "😊"]);
const FaceSplitPreview = ({ threshold, size = 22 }) => {
  const pub = publicFacesFor(threshold);
  const groups = [];
  FACE_ORDER.forEach(f => {
    const isPublic = pub.includes(f);
    const last = groups[groups.length - 1];
    if (last && last.isPublic === isPublic) last.faces.push(f);
    else groups.push({ isPublic, faces: [f] });
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {groups.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <span style={{ width: 1, alignSelf: "stretch", background: "var(--ink-200)" }}/>}
          <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderRadius: 9,
            background: g.isPublic ? "var(--success-soft)" : "var(--danger-soft)",
            border: `1px solid ${g.isPublic ? "color-mix(in srgb, var(--success) 30%, #fff)" : "color-mix(in srgb, var(--danger) 30%, #fff)"}` }}>
            {g.faces.map(f => <span key={f} style={{ fontSize: size, lineHeight: 1 }}>{f}</span>)}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
const FaceThresholdOption = ({ value, active, onClick }) => {
  const isHappyOnly = value >= 5;
  const publicFaces = isHappyOnly ? "😊" : "😐 😊";
  const privateFaces = isHappyOnly ? "😞 😐" : "😞";
  return (
    <button onClick={onClick} style={{ flex: 1, textAlign: "left", cursor: "pointer", padding: 14, borderRadius: "var(--r-lg)",
      border: active ? "2px solid var(--accent)" : "1.5px solid var(--ink-200)",
      background: active ? "var(--accent-softer)" : "var(--white)", display: "flex", flexDirection: "column", gap: 11, transition: "all .14s" }}>
      <FaceSplitPreview threshold={value}/>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 640, color: "var(--ink-900)" }}>{isHappyOnly ? "😊 only goes public" : "😐 & 😊 go public"}</div>
        <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>
          <span style={{ color: "var(--danger)", fontWeight: 560 }}>{privateFaces}</span> private &nbsp;·&nbsp; <span style={{ color: "var(--success)", fontWeight: 560 }}>{publicFaces}</span> public
        </div>
      </div>
    </button>
  );
};
const BranchPill = ({ tone, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 999, fontSize: 16, lineHeight: 1,
    whiteSpace: "nowrap", maxWidth: "none",
    background: tone === "success" ? "var(--success-soft)" : "var(--danger-soft)",
    border: `1px solid ${tone === "success" ? "color-mix(in srgb, var(--success) 30%, #fff)" : "color-mix(in srgb, var(--danger) 30%, #fff)"}` }}>{children}</span>
);

const StepFunnel = ({ cfg, set }) => {
  const onChannels = Object.keys(cfg.channels).filter(k => cfg.channels[k]);
  const rt = routingFor(cfg.ratingStyle);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* gate controls */}
      <div className="card" style={{ padding: 16, background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}><Icon name="sliders" size={17}/></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 640 }}>Smart routing</div>
            <div style={{ fontSize: 12, color: "var(--ink-400)" }}>Send happy customers public, route unhappy ones to private feedback first</div>
          </div>
          <Toggle checked={cfg.gateEnabled} onChange={v => set("gateEnabled", v)}/>
        </div>
        {cfg.gateEnabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--ink-200)", paddingTop: 14 }}>
            {cfg.ratingStyle === "faces" ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 640, color: "var(--ink-800)" }}>{rt.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4, marginBottom: 12, lineHeight: 1.4 }}>{rt.hint(cfg.gateThreshold)}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <FaceThresholdOption value={3} active={cfg.gateThreshold < 5} onClick={() => set("gateThreshold", 3)}/>
                  <FaceThresholdOption value={5} active={cfg.gateThreshold >= 5} onClick={() => set("gateThreshold", 5)}/>
                </div>
              </div>
            ) : rt.options ? (
              <Field label={rt.label} hint={rt.hint(cfg.gateThreshold)}>
                <Segmented value={String(cfg.gateThreshold)} onChange={v => set("gateThreshold", Number(v))} options={rt.options}/>
              </Field>
            ) : (
              <Field label={rt.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: "var(--r-sm)", background: "var(--white)", border: "1px solid var(--ink-200)" }}>
                  <span style={{ fontSize: 18 }}>👍</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-600)" }}>Thumbs up → public review · 👎 down → private feedback</span>
                </div>
              </Field>
            )}
            <Field label="When rating is below threshold">
              <Segmented value={cfg.negativeAction} onChange={v => set("negativeAction", v)}
                options={[{value:"feedback",label:"Collect feedback"},{value:"alert",label:"Alert manager"},{value:"both",label:"Both"}]}/>
            </Field>
          </div>
        )}
      </div>

      {/* the flow */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Funnel preview</div>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <FlowNode icon="send" title={`Send ${cfg.channel === "sms" ? "SMS" : "email"} request`} sub={`${cfg.delay}h after visit`} tone="accent"/>
          <Connector/>
          <FlowNode icon="star" title="Rate your experience" sub={rt.rateSub}/>

          {cfg.gateEnabled ? (
            <>
              {/* fork */}
              <svg viewBox="0 0 460 46" width="100%" height="46" style={{ display: "block" }}>
                <path d="M230 0 V14 Q230 23 200 23 H118 Q88 23 88 32 V46" fill="none" stroke="var(--ink-200)" strokeWidth="2"/>
                <path d="M230 0 V14 Q230 23 260 23 H342 Q372 23 372 32 V46" fill="none" stroke="var(--ink-200)" strokeWidth="2"/>
              </svg>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    {cfg.ratingStyle === "faces" ? <BranchPill tone="danger">{cfg.gateThreshold >= 5 ? "😞 😐" : "😞"}</BranchPill> : <span className="badge badge-danger">{rt.below(cfg.gateThreshold)}</span>}
                  </div>
                  <FlowNode icon="inbox" title="Private feedback" tone="danger" compact
                    sub={cfg.negativeAction === "alert" ? "WeHearYou inbox + alert" : cfg.negativeAction === "both" ? "WeHearYou inbox + alert" : "Saved to WeHearYou inbox"}/>
                </div>
                <div>
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    {cfg.ratingStyle === "faces" ? <BranchPill tone="success">{cfg.gateThreshold >= 5 ? "😊" : "😐 😊"}</BranchPill> : <span className="badge badge-success">{rt.above(cfg.gateThreshold)}</span>}
                  </div>
                  <FlowNode icon="thumb" title="Public review" tone="success" compact sub={`${onChannels.length} channel${onChannels.length===1?"":"s"}`}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {onChannels.length ? onChannels.map(src => (
                        <span key={src} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 540, padding: "2px 7px", borderRadius: 999, background: "var(--white)", border: "1px solid var(--ink-200)" }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: SOURCE_META[src].color, color: "#fff", display: "grid", placeItems: "center", fontSize: 8, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{SOURCE_META[src].letter}</span>
                          {src}
                        </span>
                      )) : <span style={{ fontSize: 11.5, color: "var(--danger)" }}>No channels selected</span>}
                    </div>
                  </FlowNode>
                </div>
              </div>
            </>
          ) : (
            <>
              <Connector/>
              <FlowNode icon="thumb" title="Public review" tone="success" sub="All ratings sent to public channels">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {onChannels.map(src => (
                    <span key={src} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 540, padding: "2px 7px", borderRadius: 999, background: "var(--white)", border: "1px solid var(--ink-200)" }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: SOURCE_META[src].color, color: "#fff", display: "grid", placeItems: "center", fontSize: 8, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{SOURCE_META[src].letter}</span>
                      {src}
                    </span>
                  ))}
                </div>
              </FlowNode>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============ STEP 4 — Message ============ */
const StepMessage = ({ cfg, set }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
    <Field label="Delivery channel">
      <Segmented value={cfg.channel} onChange={v => set("channel", v)}
        options={[{value:"sms",label:"SMS",icon:"chat"},{value:"email",label:"Email",icon:"send"}]}/>
    </Field>
    <Field label="Send delay" hint={`${cfg.delay} hour${cfg.delay===1?"":"s"} after visit`}>
      <Slider value={cfg.delay} min={0} max={48} step={1} onChange={v => set("delay", v)}/>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-400)" }} className="tnum">
        <span>Immediately</span><span>48h</span>
      </div>
    </Field>
    {cfg.channel === "email" && (
      <Field label="Subject line">
        <input className="input focus-ring" value={cfg.subject} onChange={e => set("subject", e.target.value)}/>
      </Field>
    )}
    <Field label="Message" hint={cfg.channel === "sms" ? `${cfg.message.length}/160` : "Body"}>
      <textarea className="input focus-ring" rows={cfg.channel === "sms" ? 4 : 6} value={cfg.message} onChange={e => set("message", e.target.value)}
        style={{ height: "auto", padding: "11px 12px", resize: "vertical", lineHeight: 1.55 }}/>
    </Field>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      <span style={{ fontSize: 12, color: "var(--ink-400)", alignSelf: "center" }}>Insert:</span>
      {["{first}","{location}","{link}"].map(tok => (
        <button key={tok} className="mono" onClick={() => set("message", cfg.message + " " + tok)}
          style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: "1px solid var(--ink-200)", background: "var(--ink-50)", color: "var(--accent-strong)", cursor: "pointer" }}>{tok}</button>
      ))}
    </div>
  </div>
);

/* ============ STEP 5 — Review ============ */
const SummaryRow = ({ label, children, onEdit }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderTop: "1px solid var(--ink-150)" }}>
    <span style={{ width: 110, flex: "none", fontSize: 12.5, color: "var(--ink-400)", paddingTop: 1 }}>{label}</span>
    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 540, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>{children}</div>
    <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
  </div>
);

const StepReview = ({ cfg, setStep }) => {
  const locs = LOCATIONS.filter(l => cfg.locations.includes(l.id));
  const chs = Object.keys(cfg.channels).filter(k => cfg.channels[k]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: "4px 18px 8px" }}>
        <SummaryRow label="Campaign" onEdit={() => setStep(0)}><span style={{ fontWeight: 640 }}>{cfg.name || "Untitled campaign"}</span></SummaryRow>
        <SummaryRow label="Locations" onEdit={() => setStep(0)}>
          {locs.length ? locs.map(l => <span key={l.id} className="badge badge-neutral"><Icon name="pin" size={11}/>{l.area}</span>) : <span style={{ color: "var(--danger)" }}>None selected</span>}
        </SummaryRow>
        <SummaryRow label="Rating style" onEdit={() => setStep(1)}>
          <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>{cfg.ratingStyle}</span>
          <span style={{ color: "var(--ink-400)", fontSize: 12.5 }}>{cfg.headline}</span>
        </SummaryRow>
        <SummaryRow label="Channels" onEdit={() => setStep(2)}>
          {chs.map(src => <SourceTag key={src} source={src}/>)}
        </SummaryRow>
        <SummaryRow label="Routing" onEdit={() => setStep(3)}>
          {cfg.gateEnabled
            ? <><span className="badge badge-success">{routingFor(cfg.ratingStyle).summary(cfg.gateThreshold)}</span><span className="badge badge-danger">below → {cfg.negativeAction === "alert" ? "alert" : cfg.negativeAction === "both" ? "feedback + alert" : "feedback"}</span></>
            : <span className="badge badge-neutral">All ratings public (gate off)</span>}
        </SummaryRow>
        <SummaryRow label="Delivery" onEdit={() => setStep(4)}>
          <span className="badge badge-accent">{cfg.channel === "sms" ? "SMS" : "Email"}</span>
          <span style={{ color: "var(--ink-500)" }}>{cfg.delay}h after visit</span>
        </SummaryRow>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 15, borderRadius: "var(--r-md)", background: "var(--accent-softer)", border: "1px solid var(--accent-border)" }}>
        <Icon name="sparkle" size={20} style={{ color: "var(--accent)", flex: "none" }}/>
        <div style={{ fontSize: 13, color: "var(--ink-600)", lineHeight: 1.5 }}>
          Estimated reach: <b className="tnum" style={{ color: "var(--ink-900)" }}>~840 contacts/mo</b> across {locs.length || 0} location{locs.length===1?"":"s"}. Based on recent visit volume, expect roughly <b className="tnum" style={{ color: "var(--ink-900)" }}>210 new reviews</b> in the first 90 days.
        </div>
      </div>
    </div>
  );
};

/* ============ Live phone preview ============ */
const PhonePreview = ({ cfg, stepId }) => {
  const [rating, setRating] = useStateZ(0);
  const [screen, setScreen] = useStateZ("rate"); // rate | positive | negative | sent
  useEffectZ(() => { setRating(0); setScreen("rate"); }, [stepId, cfg.gateEnabled, cfg.gateThreshold, cfg.ratingStyle]);
  const onChannels = Object.keys(cfg.channels).filter(k => cfg.channels[k]);
  const showMessage = stepId === "message";

  const pick = (n) => {
    setRating(n);
    setTimeout(() => {
      if (!cfg.gateEnabled || n >= cfg.gateThreshold) setScreen("positive");
      else setScreen("negative");
    }, 360);
  };

  return (
    <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="badge badge-success"><span style={{width:6,height:6,borderRadius:"50%",background:"var(--success)"}}/>Live preview</span>
        <span style={{ fontSize: 12, color: "var(--ink-400)" }}>{showMessage ? "Outreach message" : "Funnel experience"}</span>
      </div>

      {/* phone */}
      <div style={{ width: 290, height: 590, borderRadius: 38, background: "#0d0d12", padding: 9, boxShadow: "var(--shadow-pop)", flex: "none" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 30, background: "var(--page)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          {/* notch */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 26, background: "#0d0d12", borderRadius: "0 0 16px 16px", zIndex: 5 }}/>

          {showMessage ? (
            /* message preview */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 34, background: "var(--ink-100)" }}>
              <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 9, background: "var(--white)", borderBottom: "1px solid var(--ink-200)" }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <div><div style={{ fontSize: 13, fontWeight: 640 }}>Bright Smile</div><div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>{cfg.channel === "sms" ? "SMS · now" : "Email · now"}</div></div>
              </div>
              <div style={{ padding: 16, flex: 1 }}>
                {cfg.channel === "email" && <div style={{ fontSize: 13, fontWeight: 680, marginBottom: 10 }}>{cfg.subject}</div>}
                <div style={{ background: cfg.channel === "sms" ? "var(--white)" : "transparent", border: cfg.channel === "sms" ? "1px solid var(--ink-200)" : "0",
                  borderRadius: cfg.channel === "sms" ? "4px 16px 16px 16px" : 0, padding: cfg.channel === "sms" ? "11px 13px" : 0, fontSize: 13, lineHeight: 1.55, color: "var(--ink-700)", boxShadow: cfg.channel === "sms" ? "var(--shadow-xs)" : "none" }}>
                  {cfg.message.replace("{first}","Marcus").replace("{location}","Bright Smile").replace("{link}", cfg.channel==="sms" ? "wehr.yt/r/8f2a" : "")}
                  {cfg.channel === "email" && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Share your experience<Icon name="arrowRight" size={13}/></button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* funnel landing */
            <div style={{ flex: 1, paddingTop: 38, display: "flex", flexDirection: "column" }}>
              {/* brand bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px 14px", justifyContent: "center" }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Bright Smile</span>
              </div>

              {screen === "rate" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", textWrap: "balance" }}>{cfg.headline}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 7, lineHeight: 1.5 }}>{cfg.subheading}</div>
                  </div>
                  {cfg.ratingStyle === "faces" ? (
                    <div style={{ display: "flex", gap: 14 }}>
                      {[{e:"😞",v:2},{e:"😐",v:3},{e:"😊",v:5}].map(f => {
                        const isPublic = f.v >= cfg.gateThreshold;
                        return (
                        <div key={f.e} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                          {cfg.gateEnabled && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isPublic ? "var(--success)" : "var(--danger)" }}/>}
                          <button onClick={() => pick(f.v)}
                            style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 38, lineHeight: 1, padding: 2, transition: "transform .12s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.18)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{f.e}</button>
                        </div>
                        );
                      })}
                    </div>
                  ) : cfg.ratingStyle === "thumbs" ? (
                    <div style={{ display: "flex", gap: 20 }}>
                      {[{e:"👎",v:1},{e:"👍",v:5}].map(f => (
                        <button key={f.e} onClick={() => pick(f.v)}
                          style={{ border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", fontSize: 30, lineHeight: 1, padding: "12px 18px", borderRadius: 14, boxShadow: "var(--shadow-xs)", transition: "transform .12s" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{f.e}</button>
                      ))}
                    </div>
                  ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onMouseEnter={() => setRating(n)} onMouseLeave={() => setRating(0)} onClick={() => pick(n)}
                        style={{ border: 0, background: "transparent", cursor: "pointer", padding: 2 }}>
                        <svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill={n <= rating ? "var(--star)" : "var(--ink-200)"} style={{ transition: "fill .1s" }}/></svg>
                      </button>
                    ))}
                  </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--ink-300)" }}>Tap to preview the routing</div>
                </div>
              )}

              {screen === "positive" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 16 }}>
                  <span style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--success-soft)", color: "var(--success)", display: "grid", placeItems: "center" }}><Icon name="heart" size={26}/></span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Thank you! 🎉</div>
                    <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Would you share it where others can see?</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%" }}>
                    {onChannels.length ? onChannels.map(src => (
                      <button key={src} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "11px", borderRadius: 10, border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-xs)" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 4, background: SOURCE_META[src].color, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{SOURCE_META[src].letter}</span>
                        Review on {src}
                      </button>
                    )) : <span style={{ fontSize: 12.5, color: "var(--ink-400)" }}>Select a channel in step 2</span>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setScreen("rate"); setRating(0); }}>Start over</button>
                </div>
              )}

              {screen === "negative" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 22px", textAlign: "center", gap: 14 }}>
                  <span style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Icon name="chat" size={24}/></span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>We want to make it right</div>
                    <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Tell us what happened — this goes straight to the manager, privately.</div>
                  </div>
                  <div style={{ width: "100%", height: 72, borderRadius: 10, border: "1px solid var(--ink-200)", background: "var(--white)", padding: 10, fontSize: 12, color: "var(--ink-400)", textAlign: "left" }}>What could we have done better?</div>
                  <button className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={() => { setScreen("rate"); setRating(0); }}>Send privately</button>
                  <div style={{ fontSize: 10.5, color: "var(--ink-300)" }}>Saved to your WeHearYou inbox · not published publicly</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {!showMessage && <div style={{ fontSize: 11.5, color: "var(--ink-400)", textAlign: "center", maxWidth: 240 }}>This is exactly what your customer sees. Try tapping the stars.</div>}
    </div>
  );
};

/* ============ Wizard shell ============ */
const CampaignWizard = ({ onExit }) => {
  const [step, setStep] = useStateZ(0);
  const [maxReached, setMaxReached] = useStateZ(0);
  const [cfg, setCfg] = useStateZ({
    name: "Post-visit review request",
    locations: ["dt"],
    ratingStyle: "stars",
    headline: "How was your visit to Bright Smile Dental?",
    subheading: "Happy customers can continue to a public review, while lower ratings stay private so our team can follow up directly.",
    channels: { WeHearYou: true, Google: true, Facebook: true, Yelp: false, Trustpilot: false },
    primaryChannel: "WeHearYou",
    gateEnabled: true, gateThreshold: 4, negativeAction: "feedback",
    channel: "sms", delay: 2,
    subject: "How was your visit to Bright Smile?",
    message: DEFAULT_MSG.sms,
  });
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  // swap default message when channel changes
  useEffectZ(() => {
    setCfg(p => {
      if ((p.channel === "sms" && p.message === DEFAULT_MSG.email) || (p.channel === "email" && p.message === DEFAULT_MSG.sms))
        return { ...p, message: DEFAULT_MSG[p.channel] };
      return p;
    });
  }, [cfg.channel]);

  // remap the routing threshold to a value that fits the chosen rating style
  useEffectZ(() => {
    setCfg(p => {
      let t;
      if (p.ratingStyle === "thumbs") t = 5;                       // binary: 👍 public / 👎 private
      else if (p.ratingStyle === "faces") t = p.gateThreshold >= 4 ? 5 : 3; // 😊 only, or 😐 & 😊
      else t = [3, 4, 5].includes(p.gateThreshold) ? p.gateThreshold : 4;   // stars
      return t === p.gateThreshold ? p : { ...p, gateThreshold: t };
    });
  }, [cfg.ratingStyle]);

  const go = (n) => { const c = Math.max(0, Math.min(STEPS.length - 1, n)); setStep(c); setMaxReached(m => Math.max(m, c)); };
  const stepId = STEPS[step].id;
  const canNext = stepId === "locations" ? cfg.locations.length > 0 : stepId === "channels" ? Object.values(cfg.channels).some(Boolean) : true;

  const panel = [
    <StepLocations cfg={cfg} set={set}/>,
    <StepAppearance cfg={cfg} set={set}/>,
    <StepChannels cfg={cfg} set={set}/>,
    <StepFunnel cfg={cfg} set={set}/>,
    <StepMessage cfg={cfg} set={set}/>,
    <StepReview cfg={cfg} setStep={go}/>,
  ][step];

  const isLast = stepId === "review";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--page)" }}>
      {/* wizard header */}
      <header style={{ height: 60, flex: "none", borderBottom: "1px solid var(--ink-200)", background: "var(--white)", display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <Logo/>
        <div style={{ width: 1, height: 26, background: "var(--ink-200)" }}/>
        <div style={{ fontSize: 14, fontWeight: 600 }}>New campaign</div>
        {/* progress */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-400)" }}>Step {step + 1} of {STEPS.length}</span>
          <div style={{ width: 140, height: 5, borderRadius: 999, background: "var(--ink-150)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, background: "var(--accent)", width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width .3s cubic-bezier(.2,.7,.2,1)" }}/>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}><Icon name="close" size={16}/>Exit</button>
      </header>

      {/* body: rail | panel | preview */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "230px minmax(0,1fr) 360px" }} className="wizard-body">
        {/* rail */}
        <div style={{ borderRight: "1px solid var(--ink-200)", padding: 20, overflowY: "auto", background: "var(--white)" }} className="wizard-rail">
          <StepRail step={step} setStep={go} maxReached={maxReached}/>
          <div style={{ marginTop: 22, padding: 13, borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><Icon name="help" size={14} style={{ color: "var(--ink-400)" }}/><span style={{ fontSize: 12, fontWeight: 600 }}>{STEPS[step].label}</span></div>
            <p style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5, margin: 0 }}>{
              ["Choose which locations this campaign collects reviews for.",
               "Pick the rating style and copy customers see on the funnel page.",
               "Pick the public review sites happy customers are sent to.",
               "Smart routing sends your happiest customers to public reviews and routes unhappy ones to private feedback first — protecting your rating.",
               "Write the SMS or email that invites customers into the funnel.",
               "Double-check everything, then launch."][step]
            }</p>
          </div>
        </div>

        {/* panel */}
        <div style={{ overflowY: "auto", padding: "30px 36px" }} className="wizard-panel">
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.025em" }}>{STEPS[step].label}</h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", margin: "5px 0 26px" }}>{
              ["Name your campaign and pick where it runs.",
               "Customize what customers see on the funnel page. Preview updates live.",
               "Where should happy customers leave their review?",
               "Configure how customers are routed based on their rating.",
               "Craft the message that drives customers to your funnel.",
               "You're all set — review and launch."][step]
            }</p>
            <div key={step}>{panel}</div>
          </div>
        </div>

        {/* preview */}
        <div style={{ borderLeft: "1px solid var(--ink-200)", padding: "26px 20px", overflowY: "auto", background: "linear-gradient(180deg, var(--ink-50), var(--page))" }} className="wizard-preview">
          {isLast
            ? <LaunchPanel cfg={cfg} onLaunch={onExit}/>
            : <PhonePreview cfg={cfg} stepId={stepId}/>}
        </div>
      </div>

      {/* footer nav */}
      <footer style={{ height: 68, flex: "none", borderTop: "1px solid var(--ink-200)", background: "var(--white)", display: "flex", alignItems: "center", padding: "0 36px", gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => go(step - 1)} disabled={step === 0}><Icon name="arrowRight" size={16} style={{ transform: "rotate(180deg)" }}/>Back</button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={onExit}>Save draft</button>
          {isLast
            ? <button className="btn btn-primary" onClick={onExit}><Icon name="check" size={16}/>Launch campaign</button>
            : <button className="btn btn-primary" onClick={() => canNext && go(step + 1)} aria-disabled={!canNext} style={{ opacity: canNext ? 1 : 0.5, pointerEvents: canNext ? "auto" : "none" }}>Continue<Icon name="arrowRight" size={16}/></button>}
        </div>
      </footer>
    </div>
  );
};

/* launch panel on last step (replaces phone) */
const LaunchPanel = ({ cfg, onLaunch }) => {
  const locs = LOCATIONS.filter(l => cfg.locations.includes(l.id));
  return (
    <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 20, textAlign: "center", background: "linear-gradient(170deg, var(--accent-softer), var(--white))" }}>
        <span style={{ width: 54, height: 54, borderRadius: 16, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-md)" }}><Icon name="megaphone" size={26}/></span>
        <h3 style={{ fontSize: 17, fontWeight: 700 }}>Ready to launch</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-500)", margin: "6px 0 0", lineHeight: 1.5 }}>{cfg.name} will go live across {locs.length} location{locs.length===1?"":"s"} immediately.</p>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Before you launch</div>
        {[["Channels connected","All selected review sites are linked",true],
          ["Funnel routing","Smart gate protects your rating",cfg.gateEnabled],
          ["Message approved","Within SMS length limits",cfg.message.length <= 160 || cfg.channel==="email"]].map(([t,s,ok]) => (
          <div key={t} style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: "1px solid var(--ink-150)" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: ok ? "var(--success-soft)" : "var(--warning-soft)", color: ok ? "var(--success)" : "var(--warning)" }}><Icon name={ok?"check":"clock"} size={12}/></span>
            <div><div style={{ fontSize: 12.5, fontWeight: 580 }}>{t}</div><div style={{ fontSize: 11, color: "var(--ink-400)" }}>{s}</div></div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", height: 44 }} onClick={onLaunch}><Icon name="check" size={17}/>Launch campaign</button>
    </div>
  );
};

Object.assign(window, { CampaignWizard });
