/* GBP Manager — Performance insights.
   Mirrors the Business Profile Performance API: impressions (Search/Maps),
   customer actions (calls, directions, website), and search keywords. */

const { useState: useStateIN, useRef: useRefIN, useEffect: useEffectIN } = React;

const PERF_METRICS = [
  { key: "search", label: "Search views", color: "var(--src-google)", api: "BUSINESS_IMPRESSIONS_*_SEARCH" },
  { key: "maps", label: "Maps views", color: "var(--accent)", api: "BUSINESS_IMPRESSIONS_*_MAPS" },
  { key: "calls", label: "Calls", color: "var(--src-trustpilot)", api: "CALL_CLICKS" },
  { key: "directions", label: "Directions", color: "var(--warning)", api: "BUSINESS_DIRECTION_REQUESTS" },
  { key: "website", label: "Website clicks", color: "var(--src-facebook)", api: "WEBSITE_CLICKS" },
];

/* multi-series line chart */
const PerfChart = ({ data, active, height = 280 }) => {
  const [hover, setHover] = useStateIN(null);
  const wrapRef = useRefIN(null);
  const [w, setW] = useStateIN(720);
  useEffectIN(() => {
    const ro = new ResizeObserver(es => { for (const e of es) setW(e.contentRect.width); });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const padL = 36, padR = 12, padT = 14, padB = 28;
  const innerW = w - padL - padR, innerH = height - padT - padB;
  const series = PERF_METRICS.filter(m => active.includes(m.key));
  const max = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key])));
  const x = i => padL + (i / (data.length - 1)) * innerW;
  const y = v => padT + (1 - v / max) * innerH;
  const ticks = 4;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max / ticks) * (ticks - i);
          const yy = padT + (i / ticks) * innerH;
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="var(--ink-150)" strokeWidth="1" />
              <text x={padL - 7} y={yy + 3} textAnchor="end" fontSize="10" fill="var(--ink-400)" fontFamily="var(--font-mono)">{Math.round(v).toLocaleString()}</text>
            </g>
          );
        })}
        {series.map(s => {
          const pts = data.map((d, i) => [x(i), y(d[s.key])]);
          const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
          return (
            <g key={s.key}>
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 3.5 : 0} fill="#fff" stroke={s.color} strokeWidth="2" />)}
            </g>
          );
        })}
        {data.map((d, i) => <rect key={i} x={x(i) - innerW / data.length / 2} y={0} width={innerW / data.length} height={height} fill="transparent" onMouseEnter={() => setHover(i)} />)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--ink-300)" strokeWidth="1" strokeDasharray="3 3" />}
        {data.map((d, i) => (i % 2 === 0) && <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--ink-400)">{d.t}</text>)}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", left: `${(x(hover) / w) * 100}%`, top: 2, transform: `translateX(${hover > data.length / 2 ? "-105%" : "5%"})`, background: "var(--ink-900)", color: "#fff", borderRadius: 8, padding: "8px 11px", pointerEvents: "none", fontSize: 12, boxShadow: "var(--shadow-lg)", whiteSpace: "nowrap", zIndex: 5 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data[hover].t}</div>
          {series.map(s => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: "var(--ink-300)" }}>{s.label}</span>
              <b className="tnum" style={{ marginLeft: "auto", color: "#fff" }}>{data[hover][s.key].toLocaleString()}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GBPInsights = ({ tweaks }) => {
  const [active, setActive] = useStateIN(["search", "maps"]);
  const [range, setRange] = useStateIN("90d");
  const toggle = k => setActive(a => a.includes(k) ? (a.length > 1 ? a.filter(x => x !== k) : a) : [...a, k]);

  const totals = PERF_METRICS.map(m => ({ ...m, total: GBP_PERF_SERIES.reduce((a, d) => a + d[m.key], 0) }));

  return (
    <Page>
      <PageHeader eyebrow="Performance" title="Insights"
        sub="How customers find and act on your profiles across Google Search and Maps."
        actions={<>
          <div className="seg">
            {[["28d", "28 days"], ["90d", "90 days"], ["6m", "6 months"]].map(([k, l]) => <button key={k} data-active={range === k} onClick={() => setRange(k)}>{l}</button>)}
          </div>
          <button className="btn btn-secondary"><Icon name="external" size={16} />Export</button>
        </>}
      />

      {/* totals */}
      <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: "var(--gutter)" }}>
        {totals.map(m => (
          <button key={m.key} onClick={() => toggle(m.key)} className="card tap" style={{ padding: "14px 15px", textAlign: "left", cursor: "pointer", border: active.includes(m.key) ? `1.5px solid ${m.color}` : "1px solid var(--ink-200)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: m.color, opacity: active.includes(m.key) ? 1 : 0.35 }} />
              <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
            </div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{m.total.toLocaleString()}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)" }}>
        <SecHead title="Trend" sub="Tap the cards above to toggle series" />
        <div style={{ marginTop: 14 }}>
          <PerfChart data={GBP_PERF_SERIES} active={active} height={tweaks.density === "compact" ? 230 : 290} />
        </div>
      </div>

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)", gap: "var(--gutter)", alignItems: "start" }}>
        {/* action breakdown */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Customer actions" sub="How people engage after finding you" />
          <div style={{ marginTop: 18, display: "grid", placeItems: "center" }}>
            <Donut data={GBP_ACTIONS} centerLabel={GBP_ACTIONS.reduce((a, d) => a + d.value, 0).toLocaleString()} centerSub="total" />
          </div>
        </div>

        {/* search keywords */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Top search terms" sub="Queries that surfaced your profile (last 90 days)" action={<button className="btn btn-ghost btn-sm">View all<Icon name="chevRight" size={14} /></button>} />
          <div style={{ marginTop: 12 }}>
            {GBP_KEYWORDS.map((k, i) => {
              const max = GBP_KEYWORDS[0].impressions;
              const up = k.trend >= 0;
              return (
                <div key={k.term} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                  <Icon name="search" size={14} style={{ color: "var(--ink-400)", flex: "none" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 540, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.term}</div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden", marginTop: 5 }}>
                      <div style={{ height: "100%", borderRadius: 999, background: "var(--accent)", width: `${(k.impressions / max) * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tnum" style={{ fontSize: 13, fontWeight: 640 }}>{k.impressions.toLocaleString()}</div>
                    <span className="tnum" style={{ fontSize: 11, color: up ? "var(--success)" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <Icon name="arrowUp" size={9} style={{ transform: up ? "none" : "rotate(180deg)" }} />{Math.abs(k.trend)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* per-location breakdown */}
      <div className="card" style={{ padding: "var(--card-pad)", marginTop: "var(--gutter)" }}>
        <SecHead title="By location" sub="Profile views and actions in the last 30 days" />
        <div style={{ marginTop: 12, border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 12, padding: "10px 16px", background: "var(--ink-50)", borderBottom: "1px solid var(--ink-150)" }}>
            {["Location", "Profile views", "Actions", "Trend"].map((h, i) => <span key={h} className="eyebrow" style={{ textAlign: i ? "right" : "left" }}>{h}</span>)}
          </div>
          {GBP_LOCATIONS.map((l, i) => {
            const up = l.impressionsDelta >= 0;
            return (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "13px 16px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}><Icon name="pin" size={14} /></span>
                  <span style={{ fontSize: 13, fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.area}</span>
                </div>
                <span className="tnum" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{l.impressions30d.toLocaleString()}</span>
                <span className="tnum" style={{ textAlign: "right", fontSize: 13 }}>{l.actions30d.toLocaleString()}</span>
                <span className="tnum" style={{ textAlign: "right", fontSize: 12.5, color: up ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{up ? "+" : ""}{l.impressionsDelta}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
};

Object.assign(window, { GBPInsights });
