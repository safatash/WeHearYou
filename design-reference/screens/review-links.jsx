/* WeHearYou — Review Links (redesigned).
   Replaces the old table/copy-button pattern with:
   – Source-link cards grid (icon, context, usage tip, teal copy)
   – QR Code tab with a deterministic SVG QR + download
   – Email Sig tab with a live HTML preview
   – Analytics tab with per-source sparklines
*/

const { useState: useStateRL, useRef: useRefRL, useEffect: useEffectRL } = React;

/* ---------- mock link data ---------- */
const BASE_URL = "https://wehearyou.app/review/nova-advertising-6";
const RL_SOURCES = [
  { id: "email-sig", label: "Email Signature",   icon: "mail",        color: "var(--accent)",         param: "src=email_signature&medium=email",  badge: "Most used",
    tip: "Embed in your team's email footer. Every conversation becomes a review opportunity.", views: 42, happy: 36, unhappy: 6, spark: [3,4,4,5,6,5,7,6,8,8,9,9] },
  { id: "qr-print", label: "QR / Print",         icon: "qrCode",      color: "#8b5cf6",              param: "src=qr_counter&medium=print",        badge: null,
    tip: "Print on receipts, counter cards, or anywhere customers linger after a purchase.", views: 18, happy: 14, unhappy: 4, spark: [1,1,2,1,2,2,3,2,3,3,4,3] },
  { id: "invoice",  label: "Invoice",             icon: "clipboard",   color: "var(--warning)",        param: "src=invoice&medium=print",           badge: null,
    tip: "Send with invoices or payment confirmations — timing is perfect when the job is fresh.", views: 11, happy: 9, unhappy: 2, spark: [0,1,1,1,1,1,1,2,2,1,2,2] },
  { id: "website",  label: "Website",             icon: "globe",       color: "var(--src-google)",     param: "src=website&medium=digital",         badge: null,
    tip: "Add to your contact page, thank-you pages, or footer CTA.", views: 24, happy: 21, unhappy: 3, spark: [2,2,3,2,3,4,3,4,5,4,5,6] },
  { id: "sms",      label: "SMS / Text",          icon: "messageSquare", color: "var(--src-trustpilot)", param: "src=sms&medium=text",             badge: "New",
    tip: "Short enough for a text. Paste into your texting platform or CRM campaign.", views: 5, happy: 4, unhappy: 1, spark: [0,0,0,0,1,0,1,1,1,1,1,2] },
  { id: "direct",   label: "Direct link",         icon: "link",        color: "var(--ink-500)",        param: null,                                 badge: null,
    tip: "Base URL with no tracking. Use when you just need a clean link.", views: 7, happy: 6, unhappy: 1, spark: [1,1,1,1,1,1,1,1,1,1,1,1] },
];
const makeUrl = (param) => param ? `${BASE_URL}?${param}` : BASE_URL;

/* ---------- stats ---------- */
const RL_STATS = [
  { label: "Locations", value: "1", icon: "pin", spark: null },
  { label: "Views (30d)", value: "107", delta: +14, spark: [3,5,5,7,8,7,10,9,12,13,11,16], tone: "up" },
  { label: "Happy clicks", value: "90", delta: +16, spark: [2,4,4,6,7,6,9,8,10,11,9,14], tone: "up" },
  { label: "Private feedback", value: "17", delta: +1, spark: [1,1,1,1,1,1,1,1,2,2,2,2], tone: "neutral" },
];

/* ---------- copy hook ---------- */
const useCopy = () => {
  const [copied, setCopied] = useStateRL({});
  const copy = (id, text) => {
    try { navigator.clipboard && document.hasFocus() && navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    setCopied(p => ({ ...p, [id]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 1800);
  };
  return [copied, copy];
};

/* ---------- SVG QR code (deterministic from URL seed) ---------- */
const QRSvg = ({ url, size = 200 }) => {
  const N = 25;
  const cell = size / N;
  let hash = 5381;
  for (let i = 0; i < url.length; i++) hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  const dark = (r, c) => {
    // top-left finder
    if (r < 7 && c < 7) return (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
    // top-right finder
    if (r < 7 && c >= N-7) { const cc = c-(N-7); return (r === 0 || r === 6 || cc === 0 || cc === 6 || (r >= 2 && r <= 4 && cc >= 2 && cc <= 4)); }
    // bottom-left finder
    if (r >= N-7 && c < 7) { const rr = r-(N-7); return (rr === 0 || rr === 6 || c === 0 || c === 6 || (rr >= 2 && rr <= 4 && c >= 2 && c <= 4)); }
    // timing strips
    if (r === 6 || c === 6) return (r + c) % 2 === 0;
    // data modules
    const s = (hash ^ (r * 7919 + c * 104729) ^ ((r ^ c) * 6737)) >>> 0;
    return (s & 3) !== 0;
  };
  const rects = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (dark(r, c)) rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="var(--ink-900)" />);
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block", borderRadius: 4 }}>
      <rect width={size} height={size} fill="#fff" />
      {rects}
    </svg>
  );
};

/* ---------- Email signature HTML ---------- */
const SIG_HTML = (url) => `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#3f3f46;line-height:1.5">
  <tr><td style="padding-bottom:10px;font-weight:700;font-size:14px;color:#18181b">Sarah Thompson</td></tr>
  <tr><td style="color:#71717a">Marketing Manager · NOVA Advertising</td></tr>
  <tr><td style="color:#71717a;padding-bottom:12px">(571) 555-0192 · nova-advertising.com</td></tr>
  <tr><td>
    <a href="${url}" style="display:inline-flex;align-items:center;gap:6px;background:#37aeb7;color:#fff;text-decoration:none;font-weight:600;font-size:12px;padding:7px 14px;border-radius:7px">
      ⭐ Share your experience
    </a>
  </td></tr>
</table>`;

/* ---------- Link card ---------- */
const SourceCard = ({ src, copied, onCopy }) => {
  const url = makeUrl(src.param);
  const isCopied = copied[src.id];
  const happyPct = src.views ? Math.round((src.happy / src.views) * 100) : 0;
  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
          background: `color-mix(in srgb, ${src.color} 12%, #fff)`, color: src.color }}>
          <Icon name={src.icon === "qrCode" ? "grid" : src.icon} size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13.8, fontWeight: 640 }}>{src.label}</span>
            {src.badge && <span className="badge badge-accent" style={{ height: 18, fontSize: 10 }}>{src.badge}</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 3, lineHeight: 1.45, textWrap: "pretty" }}>{src.tip}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
        <span className="mono" style={{ flex: 1, fontSize: 11.5, color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{url}</span>
        <button onClick={() => onCopy(src.id, url)} className="btn btn-primary btn-sm" style={{ flex: "none", minWidth: 72, transition: "background .15s" }}>
          <Icon name={isCopied ? "check" : "copy"} size={13} />{isCopied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", align: "center", gap: 5 }}>
          <span className="tnum" style={{ fontSize: 12.5, fontWeight: 640 }}>{src.views}</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>views</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="tnum" style={{ fontSize: 12.5, fontWeight: 640, color: "var(--success)" }}>{src.happy}</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>happy ({happyPct}%)</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Sparkline data={src.spark} color={src.color} w={64} h={24} />
        </div>
      </div>
    </div>
  );
};

/* ---------- Funnel flow mini-diagram ---------- */
const FunnelFlow = () => (
  <div style={{ padding: "16px 18px", borderRadius: "var(--r-lg)", background: "var(--accent-softer)", border: "1px solid var(--accent-border)" }}>
    <div style={{ fontSize: 12, fontWeight: 640, color: "var(--accent-strong)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <Icon name="zap" size={14} />How the funnel works
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        ["star", "Customer clicks your link", "var(--ink-600)", null],
        ["arrowDown", null, "var(--ink-300)", null],
        ["users", "Rates their experience", "var(--ink-600)", null],
        ["arrowDown", null, "var(--ink-300)", null],
      ].filter(x => x[0] !== "arrowDown").map(([ic, label, col], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--white)", border: "1px solid var(--accent-border)", display: "grid", placeItems: "center" }}>
            <Icon name={ic} size={13} style={{ color: "var(--accent-strong)" }} />
          </span>
          <span style={{ fontSize: 12.5, color: col }}>{label}</span>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <div style={{ padding: "10px 11px", borderRadius: 10, background: "var(--success-soft)", border: "1px solid color-mix(in srgb, var(--success) 18%, #fff)" }}>
          <div style={{ fontSize: 12, fontWeight: 640, color: "var(--success)", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <Icon name="star" size={12} />4–5 stars
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.4 }}>Sent to Google to leave a public review</div>
        </div>
        <div style={{ padding: "10px 11px", borderRadius: 10, background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 18%, #fff)" }}>
          <div style={{ fontSize: 12, fontWeight: 640, color: "var(--warning)", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <Icon name="alert" size={12} />1–3 stars
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-600)", lineHeight: 1.4 }}>Captured privately so you can resolve it</div>
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   TABS
   ============================================================ */

/* --- Links tab --- */
const LinksTab = ({ copied, onCopy }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
    {/* default link */}
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
          <Icon name="link" size={16} />
        </span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 640 }}>Default link</div>
          <div style={{ fontSize: 12, color: "var(--ink-400)" }}>No tracking parameters — use when source isn't important</div>
        </div>
        <button onClick={() => onCopy("default", BASE_URL)} className="btn btn-primary" style={{ marginLeft: "auto", minWidth: 100 }}>
          <Icon name={copied["default"] ? "check" : "copy"} size={15} />{copied["default"] ? "Copied!" : "Copy link"}
        </button>
      </div>
      <div style={{ padding: "11px 13px", borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
        <span className="mono" style={{ fontSize: 12.8, color: "var(--ink-600)" }}>{BASE_URL}</span>
      </div>
    </div>

    {/* source cards grid */}
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-.01em" }}>Source-tracked links</h3>
        <span style={{ fontSize: 12, color: "var(--ink-400)" }}>Each URL shows which channel drove the visit</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {RL_SOURCES.map(src => <SourceCard key={src.id} src={src} copied={copied} onCopy={onCopy} />)}
      </div>
    </div>
  </div>
);

/* --- Email Sig tab --- */
const EmailSigTab = ({ copied, onCopy }) => {
  const [style, setStyle] = useStateRL("cta"); // cta | text | minimal
  const url = makeUrl("src=email_signature&medium=email");
  const previewStyle = {
    cta: { label: "Button CTA", desc: "Branded button in your signature — highest click rate." },
    text: { label: "Text link", desc: "Plain hyperlink — less visual weight, still tracked." },
    minimal: { label: "Minimal", desc: "Just a small star icon and a word — zero distraction." },
  };
  const fire = useToast();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: "var(--gutter)", alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 640 }}>Email signature preview</h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-400)", marginTop: 4 }}>This is how your signature will look in Gmail / Outlook.</p>
          </div>
          {/* rendered preview */}
          <div style={{ padding: "20px 22px", borderRadius: "var(--r-md)", background: "var(--white)", border: "1px solid var(--ink-200)" }}>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--ink-700)", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-900)" }}>Sarah Thompson</div>
              <div style={{ color: "var(--ink-500)" }}>Marketing Manager · NOVA Advertising</div>
              <div style={{ color: "var(--ink-500)", marginBottom: 10 }}>(571) 555-0192 · nova-advertising.com</div>
              {style === "cta" && (
                <a href="#" onClick={e => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 12, padding: "7px 14px", borderRadius: 7 }}>
                  ⭐ Share your experience
                </a>
              )}
              {style === "text" && (
                <div>Enjoyed working with us? <a href="#" onClick={e => e.preventDefault()} style={{ color: "var(--accent-strong)", fontWeight: 600, textDecoration: "underline" }}>Leave us a quick review</a></div>
              )}
              {style === "minimal" && (
                <div style={{ fontSize: 12, color: "var(--ink-400)" }}>⭐ <a href="#" onClick={e => e.preventDefault()} style={{ color: "var(--ink-500)" }}>Review us</a></div>
              )}
            </div>
          </div>
          {/* style picker */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {Object.entries(previewStyle).map(([k, v]) => (
              <button key={k} onClick={() => setStyle(k)} className="chip" data-active={style === k}>{v.label}</button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 9, lineHeight: 1.45 }}>{previewStyle[style].desc}</p>
          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            <button onClick={() => onCopy("sig-html", SIG_HTML(url))} className="btn btn-primary">
              <Icon name={copied["sig-html"] ? "check" : "copy"} size={15} />{copied["sig-html"] ? "Copied HTML!" : "Copy HTML"}
            </button>
            <button onClick={() => fire("Opening install guide…", { icon: "external" })} className="btn btn-secondary"><Icon name="external" size={15} />Install guide</button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 640, marginBottom: 12 }}>How to install</h3>
          {[["Copy the HTML above", "Use the button to copy the raw HTML signature."], ["Open Gmail or Outlook settings", "Go to Settings → Signature, then paste into the signature editor."], ["Save and send a test", "Send yourself an email to confirm the link tracks correctly."]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 11, fontWeight: 700, marginTop: 1 }}>{i + 1}</span>
              <div><div style={{ fontSize: 13, fontWeight: 580 }}>{t}</div><div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{d}</div></div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <div style={{ fontSize: 13, fontWeight: 640, marginBottom: 4 }}>Tracked URL</div>
          <div style={{ padding: "8px 11px", borderRadius: "var(--r-sm)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-500)", wordBreak: "break-all" }}>{url}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- QR Code tab --- */
const QRTab = ({ copied, onCopy }) => {
  const [qrSize, setQrSize] = useStateRL(200);
  const url = makeUrl("src=qr_counter&medium=print");
  const fire = useToast();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: "var(--gutter)", alignItems: "start" }}>
      <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ padding: 20, borderRadius: "var(--r-lg)", background: "var(--white)", border: "1px solid var(--ink-200)", boxShadow: "var(--shadow-sm)" }}>
          <QRSvg url={url} size={qrSize} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["sm", 140], ["md", 200], ["lg", 260]].map(([k, v]) => (
            <button key={k} onClick={() => setQrSize(v)} className="chip" data-active={qrSize === v} style={{ textTransform: "uppercase", fontSize: 11.5 }}>{k}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => fire("Downloading QR code as PNG…")} className="btn btn-primary"><Icon name="download" size={15} />Download PNG</button>
          <button onClick={() => fire("Downloading QR code as SVG…")} className="btn btn-secondary"><Icon name="download" size={15} />SVG</button>
          <button onClick={() => { window.print && window.print(); }} className="btn btn-secondary"><Icon name="clipboard" size={15} />Print</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 640, marginBottom: 12 }}>Best uses</h3>
          {[["Front desk / counter", "Print at 3–4″ and laminate. Customers scan while waiting."],
            ["Receipts & invoices", "Small enough for a receipt footer. Great post-transaction timing."],
            ["Window cling", "Print at 5–6″ for good scanability from a distance."],
            ["Business cards", "1.5–2″ minimum for reliable scanning from a phone."]].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
              <Icon name="checkCircle" size={15} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
              <div><div style={{ fontSize: 13, fontWeight: 560 }}>{t}</div><div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 1 }}>{d}</div></div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <div style={{ fontSize: 13, fontWeight: 640, marginBottom: 6 }}>Tracked URL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-200)" }}>
            <span className="mono" style={{ flex: 1, fontSize: 11, color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
            <button onClick={() => onCopy("qr-url", url)} className="btn btn-soft btn-sm"><Icon name={copied["qr-url"] ? "check" : "copy"} size={13} />{copied["qr-url"] ? "Copied" : "Copy"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Analytics tab --- */
const AnalyticsTab = () => {
  const total = RL_SOURCES.reduce((a, s) => a + s.views, 0);
  const happy = RL_SOURCES.reduce((a, s) => a + s.happy, 0);
  const hapPct = total ? Math.round((happy / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[["Views (30d)", total, "eye", null], ["Happy clicks", happy, "star", "var(--success)"], ["Conversion to public review", `${hapPct}%`, "arrowUpRight", "var(--accent)"]].map(([l, v, ic, c]) => (
          <div key={l} className="card" style={{ padding: "14px 16px", display: "flex", gap: 13, alignItems: "center" }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", background: c ? `color-mix(in srgb, ${c} 12%, #fff)` : "var(--ink-100)", color: c || "var(--ink-500)" }}>
              <Icon name={ic} size={17} />
            </span>
            <div><div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{l}</div></div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: "var(--card-pad)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 640, marginBottom: 4 }}>By source</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-400)", marginBottom: 16 }}>Views and happy clicks per tracked link, last 30 days</p>
        <div style={{ border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 120px 88px", gap: 10, padding: "9px 14px", background: "var(--ink-50)", borderBottom: "1px solid var(--ink-150)" }}>
            {["Source", "Views", "Happy", "Happy rate", "Trend"].map((h, i) => <span key={h} className="eyebrow" style={{ textAlign: i ? "right" : "left" }}>{h}</span>)}
          </div>
          {RL_SOURCES.map((s, i) => {
            const pct = s.views ? Math.round((s.happy / s.views) * 100) : 0;
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 120px 88px", gap: 10, alignItems: "center", padding: "12px 14px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, flex: "none", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${s.color} 12%, #fff)`, color: s.color }}>
                    <Icon name={s.icon === "qrCode" ? "grid" : s.icon} size={13} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 540 }}>{s.label}</span>
                </div>
                <span className="tnum" style={{ textAlign: "right", fontSize: 13 }}>{s.views}</span>
                <span className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--success)", fontWeight: 580 }}>{s.happy}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ height: 5, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden", marginTop: 2 }}>
                    <div style={{ height: "100%", background: pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--accent)" : "var(--warning)", borderRadius: 999, width: `${pct}%`, transition: "width .8s cubic-bezier(.2,.7,.2,1)" }} />
                  </div>
                  <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Sparkline data={s.spark} color={s.color} w={72} h={28} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Main page
   ============================================================ */
const TABS = [
  { id: "links", label: "Links", icon: "link" },
  { id: "email-sig", label: "Email Sig", icon: "mail" },
  { id: "qr", label: "QR Code", icon: "grid" },
  { id: "analytics", label: "Analytics", icon: "barChart" },
];

const ReviewLinks = () => {
  const [tab, setTab] = useStateRL("links");
  const [copied, setCopied] = useStateRL({});
  const fire = useToast();
  const copy = (id, text) => {
    try { navigator.clipboard && document.hasFocus() && navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    setCopied(p => ({ ...p, [id]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 1800);
    fire("Copied to clipboard", { icon: "copy" });
  };
  const totalViews = RL_SOURCES.reduce((a, s) => a + s.views, 0);
  const totalHappy = RL_SOURCES.reduce((a, s) => a + s.happy, 0);
  const totalUnhappy = RL_SOURCES.reduce((a, s) => a + s.unhappy, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--gutter)" }} className="anim-up">
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: "var(--gutter)", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Requests &amp; Feedback</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Review Links</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5, maxWidth: 560, textWrap: "pretty" }}>
            Anonymous links for emails, QR codes, invoices, and websites. Happy customers go to Google — unhappy ones come to you privately.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary"><Icon name="external" size={16} />Preview funnel</button>
          <button className="btn btn-primary"><Icon name="plus" size={16} />Add location</button>
        </div>
      </div>

      {/* stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: "var(--gutter)" }}>
        {[
          { label: "Locations", value: "1", icon: "pin", spark: null, delta: null },
          { label: "Views (30d)", value: totalViews, icon: "eye", spark: [3,5,5,7,8,7,10,9,12,13,11,16], delta: +14, tone: "up" },
          { label: "Happy clicks", value: totalHappy, icon: "star", spark: [2,4,4,6,7,6,9,8,10,11,9,14], delta: +16, tone: "up", col: "var(--success)" },
          { label: "Private feedback", value: totalUnhappy, icon: "lock", spark: [1,1,1,1,1,1,1,1,2,2,2,2], delta: null, col: "var(--ink-500)" },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: "var(--card-pad)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
              {m.delta != null && (
                <span className="badge tnum" style={{ background: `color-mix(in srgb, ${m.tone === "up" ? "var(--success)" : "var(--ink-400)"} 12%, #fff)`, color: m.tone === "up" ? "var(--success)" : "var(--ink-400)", height: 20, paddingLeft: 5 }}>
                  <Icon name="arrowUp" size={10} />{m.delta > 0 ? "+" : ""}{m.delta}%
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
              <span className="tnum" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1, color: m.col || "var(--ink-900)" }}>{m.value}</span>
              {m.spark && <Sparkline data={m.spark} color={m.col || "var(--accent)"} w={72} h={28} />}
            </div>
          </div>
        ))}
      </div>

      {/* location card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* location header */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 20px", borderBottom: "1px solid var(--ink-200)", background: "var(--white)" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
            <Icon name="building" size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 640 }}>NOVA Advertising</div>
            <div style={{ fontSize: 12, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <Icon name="link" size={11} />nova-advertising-6
            </div>
          </div>
          <span className="badge badge-success"><span className="dot" style={{ background: "var(--success)" }} />Funnel active</span>
        </div>

        {/* tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--ink-200)", padding: "0 20px", background: "var(--white)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="ld-tab" data-active={tab === t.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div style={{ padding: "var(--card-pad)" }} key={tab} className="anim-up">
          {tab === "links" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1fr)", gap: "var(--gutter)", alignItems: "start" }}>
              <LinksTab copied={copied} onCopy={copy} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FunnelFlow />
                <div className="card" style={{ padding: "14px 16px", background: "var(--ink-50)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-700)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="lightbulb" size={14} style={{ color: "var(--warning)" }} />Pro tip
                  </div>
                  <p style={{ fontSize: 12.3, color: "var(--ink-500)", lineHeight: 1.5, textWrap: "pretty" }}>
                    The email signature link drives the most clicks over time because it's always present — not a one-time send. Aim to have every team member add it.
                  </p>
                </div>
              </div>
            </div>
          )}
          {tab === "email-sig" && <EmailSigTab copied={copied} onCopy={copy} />}
          {tab === "qr" && <QRTab copied={copied} onCopy={copy} />}
          {tab === "analytics" && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ReviewLinks });
