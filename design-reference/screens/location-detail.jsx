/* WeHearYou — Location Detail (admin command center for one location).
   Renders model from buildLocationModel(); embeds <MiniSite/> as live preview. */

const { useState: useStateLD, useEffect: useEffectLD, useRef: useRefLD } = React;

/* ---- small helpers ---- */
const Toast = ({ msg }) => msg ? (
  <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200,
    background: "var(--ink-900)", color: "#fff", padding: "11px 18px", borderRadius: "var(--r-md)", fontSize: 13.5, fontWeight: 540,
    display: "flex", alignItems: "center", gap: 9, boxShadow: "var(--shadow-lg)" }} className="anim-up">
    <Icon name="check" size={15} style={{ color: "var(--accent)" }} />{msg}
  </div>
) : null;

const SummaryCard = ({ label, value, sub, delta, icon }) => {
  const up = typeof delta === "number" ? delta >= 0 : null;
  return (
    <div className="card" style={{ padding: "15px 16px", display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={icon} size={15} /></span>
        <span style={{ fontSize: 12.2, color: "var(--ink-500)", fontWeight: 540, lineHeight: 1.2 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>{value}</span>
        {typeof delta === "number" && (
          <span className="badge tnum" style={{ height: 19, paddingLeft: 5, background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}>
            <Icon name="arrowUp" size={10} style={{ transform: up ? "none" : "rotate(180deg)" }} />{up ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      {sub && <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{sub}</span>}
    </div>
  );
};

/* settings toggle row */
const SettingToggle = ({ checked, onChange, label, hint }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 2px" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.2, fontWeight: 540, color: "var(--ink-800)" }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1 }}>{hint}</div>}
    </div>
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      style={{ width: 38, height: 22, borderRadius: 999, flex: "none", border: "none", cursor: "pointer", padding: 2,
        background: checked ? "var(--accent)" : "var(--ink-300)", transition: "background .16s", display: "flex", alignItems: "center" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transform: checked ? "translateX(16px)" : "translateX(0)", transition: "transform .16s" }} />
    </button>
  </div>
);

/* labelled wrapper — accepts any control as children */
const LDField = ({ label, hint, full, children, value }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: full ? "1 / -1" : "auto" }}>
    <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)", letterSpacing: ".01em" }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{hint}</span>}
    </span>
    {children != null ? children
      : <input defaultValue={value} className="ld-input" style={{ height: 38, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", padding: "0 12px", fontSize: 13.5, fontFamily: "inherit", color: "var(--ink-900)", background: "var(--white)" }} />}
  </label>
);

/* input with a leading icon and/or a locked prefix/suffix text (url, slug, phone) */
const AffixInput = ({ icon, prefix, suffix, value, mono, placeholder }) => (
  <div className="ld-affix">
    {icon && <Icon name={icon} size={15} style={{ color: "var(--ink-400)", flex: "none" }} />}
    {prefix && <span className="ld-affix-fix">{prefix}</span>}
    <input defaultValue={value} placeholder={placeholder} className="ld-affix-input" style={{ fontFamily: mono ? "var(--font-mono)" : "inherit" }} />
    {suffix && <span className="ld-affix-fix" style={{ color: "var(--ink-400)" }}>{suffix}</span>}
  </div>
);

const LDTextarea = ({ value, rows = 3 }) => (
  <textarea defaultValue={value} rows={rows} className="ld-input" style={{ height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical", fontFamily: "inherit", fontSize: 13.5, color: "var(--ink-900)", background: "var(--white)", border: "1px solid var(--ink-200)", borderRadius: "var(--r-sm)" }} />
);

const LDSelect = ({ value, options, icon }) => (
  <div className="ld-affix" style={{ paddingRight: 8 }}>
    {icon && <Icon name={icon} size={15} style={{ color: "var(--ink-400)", flex: "none" }} />}
    <select defaultValue={value} className="ld-affix-input" style={{ appearance: "none", cursor: "pointer", background: "transparent", border: 0, paddingRight: 4 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevDown" size={15} style={{ color: "var(--ink-400)", flex: "none", pointerEvents: "none" }} />
  </div>
);

/* per-day business-hours editor — open/closed switch + time range */
const HoursEditor = ({ hours }) => {
  const [rows, setRows] = useStateLD(hours.map(h => {
    const [from, to] = (h.h || "").split("–").map(x => x.trim());
    return { d: h.d, open: !h.closed, from: h.closed ? "" : from, to: h.closed ? "" : to };
  }));
  const toggle = (i) => setRows(r => r.map((x, j) => j === i ? { ...x, open: !x.open } : x));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((h, i) => (
        <div key={h.d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 11px", borderRadius: "var(--r-sm)",
          border: "1px solid var(--ink-150)", background: h.open ? "var(--white)" : "var(--ink-50)" }}>
          <button type="button" onClick={() => toggle(i)} role="switch" aria-checked={h.open}
            style={{ width: 30, height: 18, borderRadius: 999, flex: "none", border: 0, cursor: "pointer", padding: 2,
              background: h.open ? "var(--accent)" : "var(--ink-300)", display: "flex", alignItems: "center", transition: "background .14s" }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transform: h.open ? "translateX(12px)" : "none", transition: "transform .14s" }} />
          </button>
          <span style={{ width: 78, fontSize: 12.6, fontWeight: 540, color: "var(--ink-700)" }}>{h.d}</span>
          {h.open ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, justifyContent: "flex-end" }}>
              <input defaultValue={h.from} className="ld-time" />
              <span style={{ color: "var(--ink-400)", fontSize: 12 }}>–</span>
              <input defaultValue={h.to} className="ld-time" />
            </div>
          ) : <span style={{ flex: 1, textAlign: "right", fontSize: 12.5, color: "var(--ink-400)", fontStyle: "italic" }}>Closed</span>}
        </div>
      ))}
    </div>
  );
};

/* hero cover image upload affordance */
const HeroSlot = ({ hue }) => (
  <div style={{ position: "relative", height: 116, borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--ink-200)",
    background: `linear-gradient(135deg, hsl(${hue} 48% 34%), hsl(${hue + 24} 52% 22%))` }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,.18), transparent 50%)" }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", color: "#fff", backdropFilter: "blur(3px)" }}><Icon name="image" size={17} /></span>
      <button type="button" className="btn btn-sm" style={{ background: "rgba(255,255,255,.92)", color: "var(--ink-900)" }}><Icon name="upload" size={13} />Upload cover</button>
    </div>
  </div>
);

const SectionCard = ({ title, desc, action, children, id }) => (
  <section id={id} className="card" style={{ padding: 0, scrollMarginTop: 80 }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--ink-150)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 640, letterSpacing: "-.01em" }}>{title}</h3>
        {desc && <p style={{ fontSize: 12.8, color: "var(--ink-500)", marginTop: 3 }}>{desc}</p>}
      </div>
      {action}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </section>
);

/* metric pill for request performance / clicks */
const MiniMetric = ({ label, value, accent }) => (
  <div style={{ padding: "13px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--ink-150)", background: accent ? "var(--accent-softer)" : "var(--ink-50)", minWidth: 0 }}>
    <div className="tnum" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", color: accent ? "var(--accent-strong)" : "var(--ink-900)" }}>{value}</div>
    <div style={{ fontSize: 11.8, color: "var(--ink-500)", marginTop: 3 }}>{label}</div>
  </div>
);

/* ============ Reviews tab ============ */
const REVIEW_FILTERS = ["All", "Needs reply", "5★", "4★", "1–3★", "Google", "Facebook", "Yelp", "Trustpilot"];
const LocationReviews = ({ model }) => {
  const [filter, setFilter] = useStateLD("All");
  const all = REVIEWS.filter(r => r.loc === model.area);
  const filtered = all.filter(r => {
    if (filter === "All") return true;
    if (filter === "Needs reply") return r.status === "pending";
    if (filter === "5★") return r.rating === 5;
    if (filter === "4★") return r.rating === 4;
    if (filter === "1–3★") return r.rating <= 3;
    return r.source === filter;
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {REVIEW_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="chip" data-active={filter === f}>{f}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "var(--ink-400)", fontSize: 13.5 }}>No reviews match this filter.</div>}
        {filtered.map(r => (
          <div key={r.id} style={{ border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", padding: 16, background: "var(--white)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
              <Avatar name={r.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 620 }}>{r.name}</span>
                  <SourceTag source={r.source} showLabel={false} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <Stars value={r.rating} size={13} />
                  <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{r.time}</span>
                </div>
              </div>
              <span className={"badge " + (r.status === "pending" ? "badge-warning" : "badge-success")}>
                <span className="dot" style={{ background: r.status === "pending" ? "var(--warning)" : "var(--success)" }} />
                {r.status === "pending" ? "Needs reply" : "Replied"}
              </span>
            </div>
            <p style={{ fontSize: 13.3, lineHeight: 1.55, color: "var(--ink-700)", margin: "0 0 12px", textWrap: "pretty" }}>{r.text}</p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm"><Icon name="reply" size={13} />Reply</button>
              <button className="btn btn-secondary btn-sm"><Icon name="star" size={13} />Feature</button>
              <button className="btn btn-ghost btn-sm"><Icon name="eye" size={13} />Hide from page</button>
              <button className="btn btn-ghost btn-sm"><Icon name="widget" size={13} />Add to widget</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============ Connected sources ============ */
const SourceRow = ({ source, status }) => {
  const m = SOURCE_META[source] || { color: "var(--ink-400)", letter: "?" };
  const connected = status === "connected";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)" }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: m.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, fontFamily: "var(--font-mono)", flex: "none" }}>{m.letter}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{source}</div>
        <div style={{ fontSize: 11.8, color: connected ? "var(--success)" : "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 1 }}>
          <span className="dot" style={{ background: connected ? "var(--success)" : "var(--ink-300)" }} />
          {connected ? "Connected · synced 2 days ago" : "Not connected"}
        </div>
      </div>
      {connected
        ? <><button className="btn btn-ghost btn-sm"><Icon name="refresh" size={13} />Sync</button><button className="btn btn-secondary btn-sm">Manage</button></>
        : <button className="btn btn-primary btn-sm"><Icon name="plug" size={13} />Connect</button>}
    </div>
  );
};

/* ============ Mini-site preview frame ============ */
const PreviewFrame = ({ model, device, settings }) => {
  const liveModel = { ...model, settings };
  const w = device === "mobile" ? 390 : 1180;
  const scale = device === "mobile" ? 1 : 0.52;
  return (
    <div style={{ background: "var(--ink-100)", borderRadius: "var(--r-md)", padding: device === "mobile" ? "22px 0" : 18, overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <div style={{ width: w * scale, height: device === "mobile" ? 620 : 560, overflow: "hidden", borderRadius: device === "mobile" ? 30 : 10, border: device === "mobile" ? "9px solid #1a2230" : "1px solid var(--ink-200)", boxShadow: "var(--shadow-md)", background: "#fff" }}>
        <div style={{ width: w, height: (device === "mobile" ? 620 : 560) / scale, transform: `scale(${scale})`, transformOrigin: "top left", overflowY: "auto", overflowX: "hidden" }} className="ld-preview-scroll">
          <MiniSite model={liveModel} embedded />
        </div>
      </div>
    </div>
  );
};

/* ============ MAIN ============ */
const LocationDetail = ({ locId, onBack, onOpenMiniSite, onSendRequest }) => {
  const base = LOCATIONS.find(l => l.id === locId) || LOCATIONS[0];
  const model = React.useMemo(() => buildLocationModel(base), [locId]);
  const [tab, setTab] = useStateLD("public");
  const [device, setDevice] = useStateLD("desktop");
  const [published, setPublished] = useStateLD(model.published);
  const [settings, setSettings] = useStateLD(model.settings);
  const [toast, setToast] = useStateLD("");
  const toastT = useRefLD(null);

  useEffectLD(() => { setSettings(model.settings); setPublished(model.published); setTab("public"); }, [locId]);

  const fire = (msg) => { setToast(msg); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 2200); };
  const copyLink = () => { try { navigator.clipboard.writeText("https://" + model.publicUrl); } catch (e) {} fire("Public page link copied"); };
  const setS = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const st = LOC_STATUS[model.statusKey];
  const TABS = [
    { id: "public", label: "Public Page", icon: "monitor" },
    { id: "settings", label: "Mini Site Settings", icon: "sliders" },
    { id: "reviews", label: "Reviews", icon: "star", count: REVIEWS.filter(r => r.loc === model.area).length },
    { id: "requests", label: "Request Performance", icon: "send" },
    { id: "sources", label: "Connected Sources", icon: "plug" },
    { id: "details", label: "Location Details", icon: "pin" },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 28px 80px" }}>
      <Toast msg={toast} />

      {/* back */}
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 14, paddingLeft: 6, color: "var(--ink-500)" }}>
        <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} />All Locations
      </button>

      {/* ===== HEADER ===== */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 20, padding: "20px 22px", flexWrap: "wrap" }}>
          <BizLogo name={model.name} size={64} radius={16} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.025em" }}>{model.name}</h1>
              <span style={{ fontSize: 14, color: "var(--ink-400)", fontWeight: 500 }}>· {model.area}</span>
              <span className={"badge " + st.cls}><span className="dot" style={{ background: st.dot }} />{st.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 13, color: "var(--ink-500)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} />{model.address}, {model.city}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Stars value={model.rating} size={14} /><b className="tnum" style={{ color: "var(--ink-800)" }}>{model.rating}</b>
                <span className="tnum">({model.reviews.toLocaleString()})</span>
              </span>
              <SourceDots sources={model.sources} />
            </div>
            {/* public url pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
              <button onClick={copyLink} className="url-pill" title="Copy link">
                <Icon name="link" size={13} style={{ color: "var(--accent-strong)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{model.publicUrl}</span>
                <Icon name="copy" size={13} style={{ color: "var(--ink-400)" }} />
              </button>
              <span className={"badge " + (published ? "badge-success" : "badge-neutral")}>
                <span className="dot" style={{ background: published ? "var(--success)" : "var(--ink-400)" }} />
                {published ? "Published" : "Not published"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", minWidth: 180 }}>
            <button onClick={onSendRequest} className="btn btn-primary"><Icon name="send" size={15} />Send review request</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onOpenMiniSite(model.id)} className="btn btn-secondary" style={{ flex: 1 }}><Icon name="external" size={14} />Open page</button>
              <button onClick={copyLink} className="btn btn-secondary" style={{ flex: 1 }}><Icon name="copy" size={14} />Copy link</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}><Icon name="sliders" size={14} />Edit</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}><Icon name="plug" size={14} />Sources</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="ld-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        <SummaryCard label="Average rating" value={model.rating} sub="across all sources" icon="star" />
        <SummaryCard label="Total reviews" value={model.reviews.toLocaleString()} sub={`${model.newThisMonth} new this month`} icon="chat" />
        <SummaryCard label="Request conversion" value={model.requestConversion + "%"} delta={5} icon="send" />
        <SummaryCard label="Pending replies" value={model.pending} sub="awaiting response" icon="inbox" />
        <SummaryCard label="Public page views" value={model.pageViews.toLocaleString()} delta={model.pageViewsDelta} icon="eye" />
        <SummaryCard label="Website clicks" value={model.clicks.website} sub="from public page" icon="external" />
        <SummaryCard label="Directions" value={model.clicks.directions} sub="map clicks" icon="pin" />
        <SummaryCard label="Calls" value={model.clicks.call} sub="tap-to-call" icon="phone" />
      </div>

      {/* incomplete banner */}
      {model.incomplete && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 18, borderColor: "var(--warning)", background: "color-mix(in srgb, var(--warning) 7%, #fff)", display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb, var(--warning) 16%, #fff)", color: "var(--warning)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="bell" size={17} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 620 }}>This mini page needs setup before it can be published</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>{model.missingSteps.length} steps remaining: {model.missingSteps.join(" · ")}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setTab("settings")}>Finish setup<Icon name="arrowRight" size={13} /></button>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div className="ld-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--ink-200)", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="ld-tab" data-active={tab === t.id}>
            <Icon name={t.icon} size={15} />{t.label}
            {t.count != null && <span className="ld-tabcount">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ===== PUBLIC PAGE TAB ===== */}
      {tab === "public" && (
        <SectionCard
          title="Public Mini Site"
          desc={`Live at ${model.publicUrl} · last updated ${model.lastUpdated}`}
          action={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div className="seg">
                <button data-active={device === "desktop"} onClick={() => setDevice("desktop")}><Icon name="monitor" size={14} />Desktop</button>
                <button data-active={device === "mobile"} onClick={() => setDevice("mobile")}><Icon name="phone" size={14} />Mobile</button>
              </div>
            </div>
          }
        >
          <PreviewFrame model={model} device={device} settings={settings} />
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => onOpenMiniSite(model.id)}><Icon name="external" size={15} />Open public page</button>
            <button className="btn btn-secondary" onClick={copyLink}><Icon name="copy" size={14} />Copy link</button>
            <button className="btn btn-secondary" onClick={() => setTab("settings")}><Icon name="sliders" size={14} />Customize</button>
            <button
              className={"btn " + (published ? "btn-ghost" : "btn-primary")}
              onClick={() => { setPublished(p => !p); fire(published ? "Mini page unpublished" : "Mini page published"); }}
              style={published ? { color: "var(--danger)" } : {}}
            >
              <Icon name={published ? "eye" : "check"} size={14} />{published ? "Unpublish" : "Publish"}
            </button>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="dot" style={{ background: published ? "var(--success)" : "var(--ink-400)" }} />
              {published ? "Published" : "Draft"} · updated {model.lastUpdated}
            </span>
          </div>
        </SectionCard>
      )}

      {/* ===== MINI SITE SETTINGS TAB ===== */}
      {tab === "settings" && (
        <div className="ld-settings-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SectionCard title="Brand & identity" desc="The cover, accent, and names shown on the public page.">
              <LDField label="Cover image">
                <HeroSlot hue={model.hue} />
              </LDField>
              <div style={{ marginTop: 16 }}>
                <LDField label="Hero accent">
                  <div style={{ display: "flex", gap: 9, marginTop: 2 }}>
                    {[188, 152, 268, 16, 210].map((h, i) => (
                      <button key={h} type="button" aria-label={"accent " + h} onClick={() => setS("_hue", h)}
                        style={{ width: 32, height: 32, borderRadius: 9, cursor: "pointer", position: "relative",
                          border: (settings._hue === h || (settings._hue == null && i === 0)) ? "2px solid var(--ink-900)" : "2px solid var(--white)",
                          outline: "1px solid var(--ink-200)", background: `linear-gradient(150deg, hsl(${h} 48% 38%), hsl(${h + 24} 52% 26%))` }} />
                    ))}
                  </div>
                </LDField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                <LDField label="Business name" value={model.name} />
                <LDField label="Location display name" value={model.area} />
              </div>
              <div style={{ marginTop: 14 }}>
                <LDField label="Business description" hint="Shown in the trust summary">
                  <LDTextarea value={model.description} rows={3} />
                </LDField>
              </div>
            </SectionCard>

            <SectionCard title="Contact & location" desc="How customers reach and find this location.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <LDField label="Address" full>
                  <AffixInput icon="pin" value={`${model.address}, ${model.city}`} />
                </LDField>
                <LDField label="Phone number">
                  <AffixInput icon="phone" value={model.phone} />
                </LDField>
                <LDField label="Website">
                  <AffixInput prefix="https://" value={model.website} />
                </LDField>
                <LDField label="Time zone" full>
                  <LDSelect icon="clock" value={model.timezone} options={["America/Los_Angeles (PT)", "America/Denver (MT)", "America/Chicago (CT)", "America/New_York (ET)"]} />
                </LDField>
                <LDField label="Public page URL" full hint="Stable unless you change the slug">
                  <AffixInput prefix="wehearyou.com/l/" value={model.slug} mono />
                </LDField>
              </div>
            </SectionCard>

            <SectionCard title="Call-to-action" desc="The primary button customers see in the hero.">
              <LDField label="Button destination">
                <div className="seg" style={{ flexWrap: "wrap" }}>
                  {CTA_TYPES.map(c => (
                    <button key={c.key} type="button" data-active={settings._cta === c.key || (!settings._cta && c.key === "review")} onClick={() => setS("_cta", c.key)}>
                      <Icon name={c.icon} size={14} />{c.label}
                    </button>
                  ))}
                </div>
              </LDField>
              <div style={{ marginTop: 14 }}>
                <LDField label="Button text" value={model.cta.label} />
              </div>
            </SectionCard>

            <SectionCard title="Business hours" desc="Toggle days open and set opening times.">
              <HoursEditor hours={model.hours} />
            </SectionCard>

            <SectionCard title="Services & categories" desc="Displayed as chips in the location section.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {model.services.map(s => (
                  <span key={s} className="chip" data-active="true" style={{ cursor: "default" }}>{s}<button type="button" style={{ display: "inline-flex", border: 0, background: "transparent", padding: 0, marginLeft: 2, cursor: "pointer", color: "inherit", opacity: .55 }}><Icon name="close" size={12} /></button></span>
                ))}
                <button className="chip"><Icon name="plus" size={12} />Add service</button>
              </div>
            </SectionCard>
          </div>

          {/* visibility + save */}
          <div style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 18 }}>
            <SectionCard title="Page sections" desc="Choose what customers see on the public page.">
              <div style={{ display: "flex", flexDirection: "column", divide: "y" }}>
                {[
                  ["showReviewSummary", "Review summary", "Average rating + AI summary"],
                  ["showFeatured", "Featured reviews", "Curated public reviews"],
                  ["showVideo", "Video testimonials", "Embedded video reviews"],
                  ["showSources", "Source badges", "Google, Yelp, Facebook…"],
                  ["showMap", "Map", "Embedded location map"],
                  ["showHours", "Business hours", "Weekly opening hours"],
                  ["showVerified", "WeHearYou verified badge", "Trust signal"],
                  ["showPoweredBy", "Powered-by branding", "Footer attribution"],
                ].map(([k, label, hint], i) => (
                  <div key={k} style={{ borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                    <SettingToggle checked={!!settings[k]} onChange={v => setS(k, v)} label={label} hint={hint} />
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5 }}>Changes appear on the public page after saving. The page URL stays the same unless you change the slug.</div>
              <div style={{ display: "flex", gap: 9 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => fire("Mini site settings saved")}><Icon name="check" size={15} />Save changes</button>
                <button className="btn btn-secondary" onClick={() => setTab("public")}><Icon name="eye" size={14} />Preview</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEWS TAB ===== */}
      {tab === "reviews" && (
        <SectionCard title="Reviews for this location" desc={`${REVIEWS.filter(r => r.loc === model.area).length} reviews · filtered to ${model.area}`}
          action={<button className="btn btn-secondary btn-sm"><Icon name="external" size={13} />Open inbox</button>}>
          <LocationReviews model={model} />
        </SectionCard>
      )}

      {/* ===== REQUESTS TAB ===== */}
      {tab === "requests" && (
        <SectionCard title="Review request performance" desc="Campaign activity for this location."
          action={<div style={{ display: "flex", gap: 8 }}><button className="btn btn-secondary btn-sm" onClick={onSendRequest}><Icon name="send" size={13} />Send request</button><button className="btn btn-primary btn-sm"><Icon name="plus" size={13} />New campaign</button></div>}>
          <div className="ld-perf" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 11 }}>
            <MiniMetric label="Requests sent" value={model.requestPerf.sent.toLocaleString()} />
            <MiniMetric label="Open rate" value={model.requestPerf.openRate + "%"} />
            <MiniMetric label="Click rate" value={model.requestPerf.clickRate + "%"} />
            <MiniMetric label="Conversion" value={model.requestPerf.conversion + "%"} accent />
            <MiniMetric label="Best channel" value={model.requestPerf.bestChannel} />
          </div>
          <div style={{ marginTop: 16, border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            {[
              { name: "Post-visit follow-up", channel: "SMS", sent: 920, conv: 34, status: "Active" },
              { name: "Monthly re-engagement", channel: "Email", sent: 640, conv: 19, status: "Active" },
              { name: "New patient welcome", channel: "SMS", sent: 280, conv: 41, status: "Paused" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 560 }}>{c.name}</div>
                  <div style={{ fontSize: 11.8, color: "var(--ink-400)", marginTop: 1 }}>{c.channel} · {c.sent} sent</div>
                </div>
                <div className="tnum" style={{ fontSize: 14, fontWeight: 640, color: "var(--accent-strong)" }}>{c.conv}%</div>
                <span style={{ fontSize: 11.5, color: "var(--ink-400)", width: 48, textAlign: "right" }}>conv.</span>
                <span className={"badge " + (c.status === "Active" ? "badge-success" : "badge-neutral")}><span className="dot" style={{ background: c.status === "Active" ? "var(--success)" : "var(--ink-400)" }} />{c.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== SOURCES TAB ===== */}
      {tab === "sources" && (
        <SectionCard title="Connected sources" desc="Review platforms syncing to this location."
          action={<button className="btn btn-secondary btn-sm"><Icon name="refresh" size={13} />Sync all</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Google", "Facebook", "Yelp", "Trustpilot"].map(s => (
              <SourceRow key={s} source={s} status={model.sources.includes(s) ? "connected" : "disconnected"} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== DETAILS TAB ===== */}
      {tab === "details" && (
        <div className="ld-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          <SectionCard title="Location details">
            <dl style={{ display: "flex", flexDirection: "column", gap: 0, margin: 0 }}>
              {[
                ["Address", `${model.address}, ${model.city}`],
                ["Phone", model.phone],
                ["Website", model.website],
                ["Time zone", model.timezone],
                ["Internal location ID", model.locId],
                ["Created", model.createdDate],
                ["Last synced", model.lastSynced],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                  <dt style={{ fontSize: 12.8, color: "var(--ink-500)" }}>{k}</dt>
                  <dd style={{ fontSize: 13, fontWeight: 540, color: "var(--ink-800)", margin: 0, textAlign: "right", fontFamily: k.includes("ID") ? "var(--font-mono)" : "inherit" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SectionCard title="Business hours">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {model.hours.map(h => (
                  <div key={h.d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--ink-500)" }}>{h.d}</span>
                    <span style={{ fontWeight: 540, color: h.closed ? "var(--ink-400)" : "var(--ink-800)" }}>{h.h}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Assigned team">
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {model.team.map(t => (
                  <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={t.name} size={34} />
                    <div><div style={{ fontSize: 13.3, fontWeight: 560 }}>{t.name}</div><div style={{ fontSize: 11.8, color: "var(--ink-400)" }}>{t.role}</div></div>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", marginTop: 2 }}><Icon name="plus" size={13} />Assign user</button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { LocationDetail });
