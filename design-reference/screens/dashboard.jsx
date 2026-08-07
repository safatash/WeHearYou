/* WeHearYou — Dashboard screen */

const { useState: useStateD } = React;

/* ---------- Metric card ---------- */
const MetricCard = ({ m, i }) => {
  const up = m.tone === "up";
  const goodDown = m.tone === "down-good";
  const positive = up || goodDown;
  const deltaColor = positive ? "var(--success)" : "var(--danger)";
  const sparkColor = m.key === "pending" ? "var(--ink-400)" : "var(--accent)";
  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
        <span className="badge" style={{ background: `color-mix(in srgb, ${deltaColor} 12%, #fff)`, color: deltaColor, height: 20, paddingLeft: 6 }}>
          <Icon name={up||goodDown ? "arrowUp" : "arrowUp"} size={11} style={{ transform: goodDown? "rotate(180deg)":"none" }}/>
          <span className="tnum">{m.delta > 0 ? "+" : ""}{m.delta}{m.key==="rating"?"":m.key==="pending"?"":"%"}</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span className="tnum" style={{ fontSize: 31, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>{m.value}</span>
          {m.suffix && <span style={{ fontSize: 18, fontWeight: 600, color: m.key==="rating"?"var(--star)":"var(--ink-400)" }}>{m.suffix}</span>}
        </div>
        <Sparkline data={m.spark} color={sparkColor} w={88} h={32}/>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{m.deltaLabel}</div>
    </div>
  );
};

/* ---------- Review item with inline reply ---------- */
const ReviewItem = ({ r, onReply }) => {
  const [open, setOpen] = useStateD(false);
  const [text, setText] = useStateD("");
  const [sent, setSent] = useStateD(r.status === "responded");
  const pending = r.status === "pending" && !sent;
  const negative = r.rating <= 2;

  const useSuggestion = () => setText(QUICK_REPLIES[r.rating] || QUICK_REPLIES[5]);
  const submit = () => { setSent(true); setOpen(false); onReply && onReply(r.id); };

  return (
    <div style={{ padding: "var(--row-pad) 4px", borderTop: "1px solid var(--ink-150)", position: "relative" }}>
      {pending && <span style={{ position: "absolute", left: -4, top: "var(--row-pad)", bottom: open?undefined:"var(--row-pad)", width: 3, borderRadius: 3, background: negative? "var(--danger)":"var(--warning)" }}/>}
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar name={r.name} size={38}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
            <Stars value={r.rating} size={13}/>
            <SourceTag source={r.source} showLabel={false}/>
            <span style={{ fontSize: 12, color: "var(--ink-400)", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="pin" size={12}/>{r.loc} · {r.time}
            </span>
          </div>
          <p style={{ fontSize: 13.3, color: "var(--ink-600)", marginTop: 6, lineHeight: 1.55, textWrap: "pretty" }}>{r.text}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            {sent ? (
              <span className="badge badge-success"><Icon name="check" size={12}/>Replied</span>
            ) : (
              <>
                <button className="btn btn-soft btn-sm" onClick={() => { setOpen(o => !o); if(!text) useSuggestion(); }}>
                  <Icon name="reply" size={14}/>Reply
                </button>
                {pending && <span className={`badge ${negative?"badge-danger":"badge-warning"}`}>{negative? "Needs attention":"Awaiting reply"}</span>}
              </>
            )}
            <button className="btn btn-ghost btn-sm btn-icon" title="Tag" style={{ marginLeft: "auto" }}><Icon name="tag" size={15}/></button>
            <button className="btn btn-ghost btn-sm btn-icon" title="Archive"><Icon name="archive" size={15}/></button>
          </div>

          {open && (
            <div className="anim-up" style={{ marginTop: 12, border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--ink-50)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--ink-200)", background: "var(--white)" }}>
                <Icon name="sparkle" size={14} style={{ color: "var(--accent)" }}/>
                <span style={{ fontSize: 12, color: "var(--ink-500)" }}>AI suggested a reply tuned to a {r.rating}★ review</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={useSuggestion}>Regenerate</button>
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                style={{ width: "100%", border: 0, resize: "vertical", padding: "10px 12px", fontSize: 13.3, fontFamily: "inherit", color: "var(--ink-800)", background: "transparent", outline: "none", lineHeight: 1.55 }}/>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderTop: "1px solid var(--ink-200)", background: "var(--white)" }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <SourceTag source={r.source} showLabel={true}/> public reply
                </span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={submit}><Icon name="send" size={13}/>Post reply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Campaign performance row ---------- */
const CampaignRow = ({ c }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: "1px solid var(--ink-150)" }}>
    <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeContent: "center",
      background: c.channel==="SMS"?"color-mix(in srgb, var(--src-trustpilot) 13%, #fff)":"var(--accent-soft)",
      color: c.channel==="SMS"?"var(--src-trustpilot)":"var(--accent-strong)" }}>
      <Icon name={c.channel==="SMS"?"chat":"send"} size={15}/>
    </span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-400)" }} className="tnum">{c.sent.toLocaleString()} sent · {c.channel}</div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div className="tnum" style={{ fontSize: 13.5, fontWeight: 640 }}>{c.rate}%</div>
      <div style={{ fontSize: 11, color: "var(--ink-400)" }}>conversion</div>
    </div>
    <span className={`badge ${c.status==="active"?"badge-success":"badge-neutral"}`} style={{ width: 8, height: 8, padding: 0, borderRadius: "50%" }} title={c.status}/>
  </div>
);

/* ---------- Section header ---------- */
const SectionHead = ({ title, sub, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 640, letterSpacing: "-.01em" }}>{title}</h3>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
    </div>
    {action}
  </div>
);

/* ---------- Dashboard ---------- */
const Dashboard = ({ tweaks }) => {
  const [tab, setTab] = useStateD("all");
  const [repliedIds, setRepliedIds] = useStateD([]);
  const chartVariant = tweaks.chartStyle || "area";

  const filtered = REVIEWS.filter(r => {
    if (tab === "all") return true;
    if (tab === "pending") return r.status === "pending" && !repliedIds.includes(r.id);
    if (tab === "responded") return r.status === "responded" || repliedIds.includes(r.id);
  });
  const pendingCount = REVIEWS.filter(r => r.status === "pending" && !repliedIds.includes(r.id)).length;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Saturday, June 13</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Good morning, Sarah</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            You have <b style={{ color: "var(--ink-800)" }}>{pendingCount} reviews</b> waiting for a reply and 3 campaigns running.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary"><Icon name="inbox" size={16}/>Review inbox</button>
          <button className="btn btn-primary" onClick={() => window.__setRoute && window.__setRoute("wizard")}><Icon name="plus" size={16}/>New campaign</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }} className="metrics-grid">
        {METRICS.map((m,i) => <MetricCard key={m.key} m={m} i={i}/>)}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: "var(--gutter)", alignItems: "start" }} className="main-grid">
        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          {/* Rating trend */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SectionHead title="Rating & volume trend" sub="Average star rating over the last 12 weeks"
              action={<div style={{ display: "flex", gap: 6 }}>
                <span className="badge badge-accent"><span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)"}}/>Avg rating</span>
              </div>} />
            <div style={{ marginTop: 14 }}>
              <RatingTrendChart data={TREND} variant={chartVariant} height={tweaks.density==="compact"?180:224}/>
            </div>
          </div>

          {/* Recent reviews */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SectionHead title="Recent reviews" sub="Across all connected sources"
              action={<button className="btn btn-ghost btn-sm">View all<Icon name="chevRight" size={14}/></button>} />
            {/* tabs */}
            <div style={{ display: "flex", gap: 4, marginTop: 12, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)", width: "fit-content" }}>
              {[["all","All"],["pending",`Pending`],["responded","Responded"]].map(([k,label]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ border: 0, cursor: "pointer", padding: "5px 12px", borderRadius: 5, fontSize: 12.5, fontWeight: 560,
                    background: tab===k?"var(--white)":"transparent", color: tab===k?"var(--ink-900)":"var(--ink-500)",
                    boxShadow: tab===k?"var(--shadow-xs)":"none", transition: "all .14s", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {label}
                  {k==="pending" && pendingCount>0 && <span className="tnum" style={{ background: "var(--warning-soft)", color: "var(--warning)", borderRadius: 999, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              {filtered.length === 0
                ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}><Icon name="check" size={22}/><div style={{marginTop:6}}>All caught up — no reviews here.</div></div>
                : filtered.map(r => <ReviewItem key={r.id} r={r} onReply={(id) => setRepliedIds(p => [...p, id])}/>)}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          {/* Sentiment */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SectionHead title="Sentiment" sub="Last 30 days"/>
            <div style={{ marginTop: 16, display: "grid", placeItems: "center" }}>
              <Donut data={SENTIMENT} centerLabel="78%" centerSub="Positive"/>
            </div>
          </div>

          {/* Sources */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SectionHead title="Review sources" sub="Where reviews come from"/>
            <div style={{ marginTop: 16 }}>
              <SourceBars data={SOURCES}/>
            </div>
          </div>

          {/* Campaign performance */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SectionHead title="Campaign performance"
              action={<button className="btn btn-ghost btn-sm btn-icon"><Icon name="dots" size={16}/></button>} />
            <div style={{ marginTop: 4 }}>
              {CAMPAIGNS.map((c,i) => <CampaignRow key={i} c={c}/>)}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 14 }}>Manage campaigns<Icon name="arrowRight" size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard });
