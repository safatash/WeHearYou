/* WeHearYou — chart components (hand-built SVG, animated, interactive) */

const { useState: useStateC, useRef: useRefC, useEffect: useEffectC } = React;

/* ---------- Rating trend: area or bars (tweak-driven) ---------- */
const RatingTrendChart = ({ data, variant = "area", height = 220 }) => {
  const [hover, setHover] = useStateC(null);
  const wrapRef = useRefC(null);
  const [w, setW] = useStateC(680);
  useEffectC(() => {
    const ro = new ResizeObserver(es => { for (const e of es) setW(e.contentRect.width); });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padL = 8, padR = 8, padT = 14, padB = 26;
  const h = height;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  // rating axis fixed 4.0–5.0 for sensitivity
  const rMin = 4.0, rMax = 5.0;
  const x = i => padL + (i/(data.length-1)) * innerW;
  const y = r => padT + (1 - (r - rMin)/(rMax - rMin)) * innerH;
  const vMax = Math.max(...data.map(d => d.volume));

  const linePts = data.map((d,i) => [x(i), y(d.rating)]);
  const linePath = linePts.map((p,i) => `${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length-1)},${padT+innerH} L${padL},${padT+innerH} Z`;
  const gridYs = [4.0, 4.25, 4.5, 4.75, 5.0];

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}
         onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="rtArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16"/>
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* gridlines */}
        {gridYs.map(g => (
          <g key={g}>
            <line x1={padL} x2={w-padR} y1={y(g)} y2={y(g)} stroke="var(--ink-150)" strokeWidth="1"/>
            <text x={w-padR} y={y(g)-4} textAnchor="end" fontSize="10.5" fill="var(--ink-400)" fontFamily="var(--font-mono)">{g.toFixed(2)}</text>
          </g>
        ))}

        {variant === "bars" ? (
          data.map((d,i) => {
            const bw = Math.min(34, innerW/data.length * 0.5);
            const bx = x(i) - bw/2;
            const bh = ((d.rating - rMin)/(rMax-rMin)) * innerH;
            const active = hover === i;
            return (
              <rect key={i} x={bx} y={padT+innerH-bh} width={bw} height={bh} rx="4"
                fill={active ? "var(--accent-strong)" : "var(--accent)"} opacity={active?1:0.85}
                style={{ transition: "all .14s", transformOrigin: "bottom" }}/>
            );
          })
        ) : (
          <>
            <path d={areaPath} fill="url(#rtArea)"/>
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            {linePts.map((p,i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={hover===i?4.5:3} fill="#fff" stroke="var(--accent)" strokeWidth="2"
                style={{ transition: "r .12s" }}/>
            ))}
          </>
        )}

        {/* hover hit areas */}
        {data.map((d,i) => (
          <rect key={i} x={x(i)-innerW/data.length/2} y={0} width={innerW/data.length} height={h}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT+innerH} stroke="var(--ink-300)" strokeWidth="1" strokeDasharray="3 3"/>
        )}

        {/* x labels (every other) */}
        {data.map((d,i) => (i%2===0) && (
          <text key={i} x={x(i)} y={h-7} textAnchor="middle" fontSize="10.5" fill="var(--ink-400)">{d.t}</text>
        ))}
      </svg>

      {hover !== null && (
        <div style={{ position: "absolute", left: `${(x(hover)/w)*100}%`, top: 2, transform: "translateX(-50%)",
          background: "var(--ink-900)", color: "#fff", borderRadius: 8, padding: "7px 10px", pointerEvents: "none",
          fontSize: 12, boxShadow: "var(--shadow-lg)", whiteSpace: "nowrap", zIndex: 5 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{data[hover].t}</div>
          <div style={{ display: "flex", gap: 10, color: "var(--ink-300)" }}>
            <span><b style={{color:"#fff"}} className="tnum">{data[hover].rating.toFixed(1)}★</b> avg</span>
            <span><b style={{color:"#fff"}} className="tnum">{data[hover].volume}</b> reviews</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Donut (sentiment) ---------- */
const Donut = ({ data, size = 132, thickness = 16, centerLabel, centerSub }) => {
  const [hover, setHover] = useStateC(null);
  const r = (size - thickness)/2;
  const C = 2 * Math.PI * r;
  const total = data.reduce((a,d) => a+d.value, 0);
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={thickness}/>
          {data.map((d,i) => {
            const frac = d.value/total;
            const dash = frac * C;
            const off = acc * C;
            acc += frac;
            const active = hover === i;
            return (
              <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                stroke={d.color} strokeWidth={active ? thickness+3 : thickness}
                strokeDasharray={`${dash} ${C-dash}`} strokeDashoffset={-off}
                strokeLinecap="butt"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ transition: "stroke-width .14s", cursor: "default" }}/>
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.02em", lineHeight: 1 }}>
            {hover !== null ? data[hover].value + "%" : centerLabel}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>
            {hover !== null ? data[hover].name : centerSub}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {data.map((d,i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default", opacity: hover===null||hover===i?1:0.5, transition: "opacity .14s" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }}/>
            <span style={{ fontSize: 12.5, color: "var(--ink-600)", minWidth: 58 }}>{d.name}</span>
            <span className="tnum" style={{ fontSize: 12.5, fontWeight: 620, marginLeft: "auto" }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Source bars ---------- */
const SourceBars = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d,i) => (
        <div key={d.name}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-700)", fontWeight: 540 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color }}/>{d.name}
            </span>
            <span style={{ color: "var(--ink-400)" }}><b className="tnum" style={{ color: "var(--ink-800)" }}>{d.value.toLocaleString()}</b> · {d.pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, background: d.color, width: `${(d.value/max)*100}%`,
              animation: `growW .9s ${i*0.08}s cubic-bezier(.2,.7,.2,1) both` }}/>
          </div>
        </div>
      ))}
    </div>
  );
};

const chartKeyframes = `
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes growW { from { width: 0 !important; } }
@keyframes donut { from { stroke-dasharray: 0 9999; } }
`;

Object.assign(window, { RatingTrendChart, Donut, SourceBars, chartKeyframes });
