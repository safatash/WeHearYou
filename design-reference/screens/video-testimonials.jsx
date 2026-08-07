/* WeHearYou — Video testimonials: collect via recording link → review → publish.
   Videos are hosted on WeHearYou only (no external review sources). */

const { useState: useStateV, useEffect: useEffectV } = React;

/* deterministic cinematic gradient (placeholder for recorded footage) */
const vGrad = (hue) =>
  `linear-gradient(150deg, hsl(${hue} 48% 32%) 0%, hsl(${hue + 24} 46% 18%) 70%, hsl(${hue + 38} 52% 11%) 100%)`;

/* ---------- play glyph ---------- */
const PlayGlyph = ({ size = 52, solid = false }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flex: "none",
    background: solid ? "var(--accent)" : "rgba(255,255,255,.92)", display: "grid", placeItems: "center",
    boxShadow: solid ? "0 6px 18px color-mix(in srgb, var(--accent) 55%, transparent)" : "0 6px 20px rgba(0,0,0,.32)",
    transition: "transform .18s ease" }}>
    <svg width={size * 0.34} height={size * 0.34} viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" fill={solid ? "#fff" : "var(--accent)"} />
    </svg>
  </span>
);

/* ---------- video thumbnail surface ---------- */
const VideoThumb = ({ v, big = false }) => (
  <div style={{ position: "relative", width: "100%", height: "100%", background: vGrad(v.hue), overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 32% 22%, rgba(255,255,255,.13), transparent 55%)" }} />
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <PlayGlyph size={big ? 64 : 50} />
    </div>
    <span className="tnum" style={{ position: "absolute", bottom: 9, right: 9, background: "rgba(0,0,0,.62)",
      color: "#fff", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 5 }}>{v.length}</span>
  </div>
);

/* ---------- lightbox player ---------- */
const Lightbox = ({ v, onClose, onPrev, onNext }) => {
  useEffectV(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [v.id]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(12,12,16,.74)", backdropFilter: "blur(6px)",
      display: "grid", placeItems: "center", padding: 24, animation: "fade .18s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} className="vt-lightbox"
        style={{ width: "min(940px, 94vw)", maxHeight: "90vh", background: "var(--white)", borderRadius: "var(--r-xl)", overflow: "hidden",
          display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", boxShadow: "0 32px 80px rgba(0,0,0,.5)", animation: "pop .2s ease both" }}>
        <div style={{ position: "relative", background: vGrad(v.hue), minHeight: 420 }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <button className="vt-bigplay" style={{ border: 0, background: "transparent", cursor: "pointer" }}><PlayGlyph size={82} /></button>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "16px 18px", background: "linear-gradient(transparent, rgba(0,0,0,.55))" }}>
            <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,.28)" }}>
              <div style={{ width: "30%", height: "100%", borderRadius: 4, background: "#fff" }} />
            </div>
            <div className="tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "rgba(255,255,255,.9)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              <span>0:06</span><span>{v.length}</span>
            </div>
          </div>
          <span style={{ position: "absolute", top: 14, left: 14, display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>
            <Icon name="film" size={12} />Hosted on WeHearYou
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--ink-150)" }}>
            <span className={`badge ${v.status === "published" ? "badge-success" : "badge-warning"}`}>
              {v.status === "published" ? "Published" : "Awaiting review"}
            </span>
            <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" title="Close (Esc)"><Icon name="close" size={17} /></button>
          </div>
          <div style={{ padding: "18px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar name={v.name} size={44} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 660 }}>{v.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-400)" }}>{v.loc}</div>
              </div>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 580, color: "var(--ink-900)", margin: "18px 0 0", textWrap: "pretty" }}>&ldquo;{v.quote}&rdquo;</p>
            <div className="eyebrow" style={{ margin: "20px 0 7px" }}>Transcript</div>
            <p style={{ fontSize: 13.3, lineHeight: 1.65, color: "var(--ink-600)", margin: 0, textWrap: "pretty" }}>{v.transcript}</p>
            <div className="eyebrow" style={{ margin: "20px 0 7px" }}>Recording prompt</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-500)", margin: 0, fontStyle: "italic" }}>&ldquo;{v.prompt}&rdquo;</p>
            <div style={{ display: "flex", gap: 14, marginTop: 18, fontSize: 12, color: "var(--ink-400)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={14} />{v.date}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="film" size={14} />{v.length}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderTop: "1px solid var(--ink-150)" }}>
            <button onClick={onPrev} className="btn btn-secondary btn-sm btn-icon" title="Previous (←)"><Icon name="chevDown" size={16} style={{ transform: "rotate(90deg)" }} /></button>
            <button onClick={onNext} className="btn btn-secondary btn-sm btn-icon" title="Next (→)"><Icon name="chevDown" size={16} style={{ transform: "rotate(-90deg)" }} /></button>
            <button className="btn btn-soft btn-sm"><Icon name="copy" size={14} />Copy embed</button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}><Icon name="send" size={14} />Share</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- testimonial card (All Testimonials) ---------- */
const TestimonialCard = ({ v, onWatch, onPublish, onDelete }) => {
  const [showPrompt, setShowPrompt] = useStateV(false);
  const [copied, setCopied] = useStateV(false);
  const published = v.status === "published";
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <button onClick={() => onWatch(v)} className="vt-thumb tap focus-ring"
        style={{ border: 0, padding: 0, cursor: "pointer", borderRadius: "var(--r-md)", overflow: "hidden", aspectRatio: "16 / 11", position: "relative" }}>
        <VideoThumb v={v} />
      </button>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 660, letterSpacing: "-.01em" }}>{v.name}</span>
          <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)", flex: "none" }}>{v.date}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{v.loc}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span className={`badge ${published ? "badge-success" : "badge-warning"}`}>
          <span className="dot" style={{ background: published ? "var(--success)" : "var(--warning)" }} />{published ? "Published" : "Awaiting review"}
        </span>
        {v.autoThumb && <span className="badge badge-neutral" style={{ gap: 5 }}><Icon name="sparkle" size={11} />Auto thumbnail</span>}
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-700)", margin: 0, fontWeight: 500, textWrap: "pretty",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>&ldquo;{v.quote}&rdquo;</p>

      <button onClick={() => setShowPrompt(p => !p)} className="tap focus-ring"
        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: 0, background: "transparent", cursor: "pointer",
          color: "var(--accent-strong)", fontSize: 12, fontWeight: 540, padding: 0, alignSelf: "flex-start" }}>
        <Icon name="chevDown" size={13} style={{ transform: showPrompt ? "rotate(180deg)" : "none", transition: "transform .15s" }} />Recording prompt
      </button>
      {showPrompt && (
        <div className="anim-up" style={{ fontSize: 12.5, color: "var(--ink-500)", background: "var(--ink-50)", border: "1px solid var(--ink-150)",
          borderRadius: "var(--r-sm)", padding: "8px 11px", fontStyle: "italic", marginTop: -4 }}>&ldquo;{v.prompt}&rdquo;</div>
      )}

      <div className="hr" style={{ marginTop: 2 }} />

      {/* actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onWatch(v)}><Icon name="external" size={13} />Watch</button>
        <button className="btn btn-secondary btn-sm"><Icon name="palette" size={13} />Edit thumbnail</button>
        {!published && <button className="btn btn-primary btn-sm" onClick={() => onPublish(v)}><Icon name="check" size={13} />Approve &amp; publish</button>}
        <button className="btn btn-secondary btn-sm" onClick={copy}><Icon name={copied ? "check" : "code"} size={13} />{copied ? "Copied" : "Copy embed"}</button>
        <button className="btn btn-ghost btn-sm btn-icon" title="Edit details"><Icon name="sliders" size={15} /></button>
        <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => onDelete(v)} style={{ color: "var(--danger)" }}><Icon name="trash" size={15} /></button>
      </div>
    </div>
  );
};

/* ---------- stat tile ---------- */
const VStat = ({ label, value, icon, tone }) => {
  const color = tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--success)" : "var(--ink-900)";
  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
        background: tone === "warning" ? "var(--warning-soft)" : tone === "success" ? "var(--success-soft)" : "var(--ink-100)",
        color: tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--success)" : "var(--ink-500)" }}>
        <Icon name={icon} size={18} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
        <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color }}>{value}</div>
      </div>
    </div>
  );
};

/* ---------- field wrapper ---------- */
const VField = ({ label, hint, children }) => (
  <div>
    <label className="lbl" style={{ display: "block", fontSize: 12.5, fontWeight: 560, color: "var(--ink-700)", marginBottom: 7 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 6 }}>{hint}</div>}
  </div>
);

/* ---------- Send a Video Request ---------- */
const RequestForm = () => {
  const [loc, setLoc] = useStateV(VIDEO_LOCATIONS[0]);
  const [contact, setContact] = useStateV("");
  const [name, setName] = useStateV("");
  const [email, setEmail] = useStateV("");
  const [phone, setPhone] = useStateV("");
  const [channel, setChannel] = useStateV("email");
  const [prompt, setPrompt] = useStateV("");
  const [sent, setSent] = useStateV(false);

  const brand = loc.split("—")[0].trim();
  const livePrompt = prompt.trim() || `How has ${brand} helped you?`;

  const send = () => { setSent(true); setTimeout(() => setSent(false), 2400); };

  const inputStyle = { height: 38, width: "100%" };

  return (
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 660, letterSpacing: "-.015em" }}>Send a video request</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4 }}>Send a customer a personalised link to record a short video testimonial via email or SMS.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, .92fr)", gap: 26 }} className="vt-request-grid">
        {/* left — form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <VField label="Location">
            <select className="input" value={loc} onChange={e => setLoc(e.target.value)} style={{ height: 38, cursor: "pointer" }}>
              {VIDEO_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </VField>

          <VField label="Contact" hint="Or enter manually below if not in contacts">
            <div style={{ position: "relative" }}>
              <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
              <input className="input" placeholder="Search by name, email, or phone…" value={contact} onChange={e => setContact(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
          </VField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: 12, background: "var(--ink-50)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)" }} className="vt-manual-grid">
            <VField label="Name"><input className="input" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></VField>
            <VField label="Email"><input className="input" placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></VField>
            <VField label="Phone"><input className="input" placeholder="+1 703 123 4567" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} /></VField>
          </div>

          <VField label="Channel">
            <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
              {[["email", "Email", "send"], ["sms", "SMS", "chat"]].map(([k, lbl, ic]) => {
                const active = channel === k;
                return (
                  <button key={k} onClick={() => setChannel(k)}
                    style={{ flex: 1, border: 0, cursor: "pointer", padding: "8px 12px", borderRadius: 5, fontSize: 13, fontWeight: 560,
                      background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)",
                      boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <Icon name={ic} size={15} />{lbl}
                  </button>
                );
              })}
            </div>
          </VField>

          <VField label="Recording prompt" hint={`Shown to the customer while recording. Defaults to “How has ${brand} helped you?” if left blank.`}>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder={`How has ${brand} helped you?`}
              className="input" style={{ height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />
          </VField>

          <button className={`btn ${sent ? "btn-soft" : "btn-primary"}`} onClick={send} style={{ height: 42 }}>
            <Icon name={sent ? "check" : "send"} size={16} />{sent ? `Request sent via ${channel === "email" ? "email" : "SMS"}` : "Send video request"}
          </button>
        </div>

        {/* right — preview */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{channel === "email" ? "Email preview" : "SMS preview"} — what your customer receives</div>
          {channel === "email" ? (
            <div style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ink-150)", background: "var(--ink-50)" }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>From: {brand} via WeHearYou</div>
                <div style={{ fontSize: 13.5, fontWeight: 620, marginTop: 3 }}>Share a quick video about your experience</div>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0, lineHeight: 1.6 }}>Hi {name || "there"},</p>
                <p style={{ fontSize: 13, color: "var(--ink-600)", margin: "10px 0 0", lineHeight: 1.6 }}>
                  Thank you for being a customer of {brand}. We'd love to hear your experience in your own words — would you be willing to record a short 90-second video?
                </p>
                <div style={{ borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)", borderRadius: "0 var(--r-sm) var(--r-sm) 0",
                  padding: "10px 13px", margin: "14px 0", fontSize: 13, fontStyle: "italic", color: "var(--ink-700)" }}>&ldquo;{livePrompt}&rdquo;</div>
                <div className="btn btn-primary" style={{ width: "100%", justifyContent: "center", pointerEvents: "none" }}><Icon name="film" size={15} />Record my video</div>
                <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: "12px 0 0", textAlign: "center" }}>Nothing to download or install. Takes about 90 seconds.</p>
              </div>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
                borderRadius: 14, padding: "12px 14px", fontSize: 13, color: "var(--ink-700)", lineHeight: 1.55, maxWidth: "85%" }}>
                Hi {name || "there"}! {brand} would love a quick video of your experience. Record one in ~90s (no app needed): <span style={{ color: "var(--accent-strong)", fontWeight: 560 }}>wehear.you/r/9x2k</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 8 }}>Sent from {brand} via WeHearYou</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- page ---------- */
const FILTERS = [
  { id: "all", label: "All" },
  { id: "review", label: "Awaiting review" },
  { id: "published", label: "Published" },
];

const VideoTestimonials = () => {
  const [videos, setVideos] = useStateV(VIDEOS);
  const [filter, setFilter] = useStateV("all");
  const [openId, setOpenId] = useStateV(null);

  const received = videos.length;
  const awaiting = videos.filter(v => v.status === "review").length;
  const published = videos.filter(v => v.status === "published").length;

  const shown = videos.filter(v => filter === "all" ? true : v.status === filter);
  const openIndex = openId ? shown.findIndex(v => v.id === openId) : -1;
  const openVideo = openIndex >= 0 ? shown[openIndex] : (openId ? videos.find(v => v.id === openId) : null);
  const step = (d) => { const i = shown.findIndex(v => v.id === openId); if (i >= 0) setOpenId(shown[(i + d + shown.length) % shown.length].id); };

  const publish = (v) => setVideos(list => list.map(x => x.id === v.id ? { ...x, status: "published" } : x));
  const remove = (v) => { if (window.confirm(`Delete ${v.name}'s testimonial? This can't be undone.`)) setVideos(list => list.filter(x => x.id !== v.id)); };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Video Testimonials</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Collect and publish video testimonials</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            Generate a recording link, share it with a customer, review their submission, and embed published videos on your website.
          </p>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }} className="vt-stats">
        <VStat icon="film" label="Total received" value={received} />
        <VStat icon="clock" label="Awaiting review" value={awaiting} tone="warning" />
        <VStat icon="check" label="Published" value={published} tone="success" />
      </div>

      {/* request form */}
      <div style={{ marginBottom: "var(--gutter)" }}>
        <RequestForm />
      </div>

      {/* all testimonials */}
      <div className="card" style={{ padding: "var(--card-pad)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 660, letterSpacing: "-.015em" }}>All testimonials</h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>Recorded by your customers · hosted on WeHearYou</p>
          </div>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
            {FILTERS.map(f => {
              const active = filter === f.id;
              const count = f.id === "all" ? videos.length : videos.filter(v => v.status === f.id).length;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  style={{ border: 0, cursor: "pointer", padding: "5px 12px", borderRadius: 5, fontSize: 12.5, fontWeight: 560,
                    background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)",
                    boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {f.label}
                  <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--accent-strong)" : "var(--ink-400)" }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-400)" }}>
            <Icon name="film" size={26} />
            <div style={{ marginTop: 8, fontSize: 13.5 }}>No testimonials in this view yet.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(296px, 1fr))", gap: "var(--gutter)" }}>
            {shown.map(v => <TestimonialCard key={v.id} v={v} onWatch={(vv) => setOpenId(vv.id)} onPublish={publish} onDelete={remove} />)}
          </div>
        )}
      </div>

      {openVideo && <Lightbox v={openVideo} onClose={() => setOpenId(null)} onPrev={() => step(-1)} onNext={() => step(1)} />}
    </div>
  );
};

Object.assign(window, { VideoTestimonials });
