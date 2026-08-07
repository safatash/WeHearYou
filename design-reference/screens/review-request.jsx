/* WeHearYou — Send review requests (/campaigns/new): two-pane builder with live preview */

const { useState: useStateR, useEffect: useEffectR, useMemo: useMemoR, useRef: useRefR } = React;

/* mock contacts available to request */
const RR_CONTACTS = [
  { id: "c1", name: "Marcus Webb",  email: "marcus.webb@gmail.com",  phone: "(415) 555-0110", loc: "dt", channel: "sms" },
  { id: "c2", name: "Priya Anand",  email: "priya.a@outlook.com",    phone: "(408) 555-0148", loc: "wp", channel: "email" },
  { id: "c3", name: "Tom Becker",   email: "tom.becker@gmail.com",   phone: "(415) 555-0192", loc: "dt", channel: "sms" },
  { id: "c4", name: "Sara Mendel",  email: "sara.mendel@gmail.com",  phone: "(415) 555-0177", loc: "dt", channel: "email" },
  { id: "c5", name: "Dani Okafor",  email: "dani.okafor@gmail.com",  phone: "(510) 555-0133", loc: "nb", channel: "sms" },
  { id: "c6", name: "Lena Fischer", email: "lena.f@proton.me",       phone: "(408) 555-0166", loc: "wp", channel: "email" },
  { id: "c7", name: "Owen Bradley", email: "owen.brad@gmail.com",    phone: "(415) 555-0121", loc: "dt", channel: "sms" },
  { id: "c8", name: "Nadia Rahman", email: "nadia.r@gmail.com",      phone: "(510) 555-0155", loc: "nb", channel: "sms" },
];

const RR_DEFAULTS = {
  review: {
    subject: "How was your experience with {location}?",
    sms: "Hi {first}, thanks for visiting {location}! We'd love a quick review — it only takes 30 seconds: {link}",
    cta: "Leave a review",
  },
  video: {
    subject: "Share a quick video about {location}",
    sms: "Hi {first}! {location} would love a short video of your experience — no app needed, ~90s: {link}",
    cta: "Record my video",
  },
};

const fillTokens = (s, first, location) =>
  (s || "").replaceAll("{first}", first).replaceAll("{location}", location).replaceAll("{link}", "wehr.yt/r/8f2a");

/* ---------- field label ---------- */
const RLabel = ({ children, hint }) => (
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
    <label style={{ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" }}>{children}</label>
    {hint && <span style={{ fontSize: 11.5, color: "var(--ink-400)" }} className="tnum">{hint}</span>}
  </div>
);

/* ---------- section card ---------- */
const RCard = ({ step, title, sub, children, right }) => (
  <div className="card" style={{ padding: "var(--card-pad)" }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 20 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, flex: "none", display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{step}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em" }}>{title}</h3>
        {sub && <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

/* ---------- selectable option card (type / channel) ---------- */
const OptionCard = ({ on, onClick, icon, title, desc, kind = "radio", accent }) => (
  <button onClick={onClick} className="tap focus-ring" type="button"
    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left", width: "100%",
      border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: on ? "var(--accent-softer)" : "var(--white)",
      boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "none", transition: "all .14s" }}>
    {icon && (
      <span style={{ width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center",
        background: on ? "var(--accent)" : "var(--ink-100)", color: on ? "#fff" : "var(--ink-500)", transition: "all .14s" }}>
        <Icon name={icon} size={18} />
      </span>
    )}
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 14, fontWeight: 620, color: "var(--ink-900)" }}>{title}</span>
      {desc && <span style={{ display: "block", fontSize: 12, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.4 }}>{desc}</span>}
    </span>
    <span style={{ width: 20, height: 20, flex: "none", borderRadius: kind === "radio" ? "50%" : 6, display: "grid", placeItems: "center",
      border: on ? "0" : "1.5px solid var(--ink-300)", background: on ? "var(--accent)" : "transparent", color: "#fff", marginTop: 1 }}>
      {on && <Icon name="check" size={13} />}
    </span>
  </button>
);

/* ---------- recipient picker ---------- */
const RecipientPicker = ({ locId, selected, setSelected }) => {
  const [q, setQ] = useStateR("");
  const [openAdd, setOpenAdd] = useStateR(false);
  const [manual, setManual] = useStateR({ name: "", contact: "" });
  const ref = useRefR(null);

  const pool = RR_CONTACTS.filter(c => locId === "all" ? true : c.loc === locId);
  const matches = pool.filter(c =>
    !selected.find(s => s.id === c.id) &&
    (q.trim() === "" || (c.name + c.email + c.phone).toLowerCase().includes(q.toLowerCase()))
  );

  const add = (c) => { setSelected(s => [...s, c]); setQ(""); };
  const remove = (id) => setSelected(s => s.filter(x => x.id !== id));
  const addManual = () => {
    if (!manual.name.trim()) return;
    const isEmail = manual.contact.includes("@");
    add({ id: "m" + Date.now(), name: manual.name.trim(), email: isEmail ? manual.contact : "", phone: isEmail ? "" : manual.contact, loc: locId, channel: isEmail ? "email" : "sms", manual: true });
    setManual({ name: "", contact: "" }); setOpenAdd(false);
  };

  useEffectR(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setQ(q => q); };
    return () => {};
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* selected chips */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {selected.map(c => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 9px 5px 5px", borderRadius: 999,
              background: "var(--accent-softer)", border: "1px solid var(--accent-border)" }}>
              <Avatar name={c.name} size={22} />
              <span style={{ fontSize: 12.5, fontWeight: 560, color: "var(--ink-800)" }}>{c.name}</span>
              <button onClick={() => remove(c.id)} className="tap" title="Remove"
                style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)", padding: 0 }}>
                <Icon name="close" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* search + add */}
      <div ref={ref} style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
            <input className="input focus-ring" value={q} onChange={e => setQ(e.target.value)} placeholder="Search contacts by name, email, or phone…" style={{ paddingLeft: 32 }} />
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => setOpenAdd(o => !o)}><Icon name="plus" size={15} />Add manually</button>
        </div>

        {/* manual add */}
        {openAdd && (
          <div className="anim-up card" style={{ padding: 12, marginTop: 8, display: "flex", gap: 8, alignItems: "flex-end", boxShadow: "var(--shadow-md)" }}>
            <div style={{ flex: 1 }}>
              <RLabel>Name</RLabel>
              <input className="input focus-ring" value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div style={{ flex: 1.4 }}>
              <RLabel>Email or phone</RLabel>
              <input className="input focus-ring" value={manual.contact} onChange={e => setManual(m => ({ ...m, contact: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <button className="btn btn-primary" type="button" onClick={addManual} style={{ flex: "none" }}>Add</button>
          </div>
        )}

        {/* matches dropdown list */}
        {q.trim() !== "" && matches.length > 0 && (
          <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, padding: 6, maxHeight: 240, overflowY: "auto", zIndex: 30, boxShadow: "var(--shadow-pop)" }}>
            {matches.map(c => (
              <button key={c.id} onClick={() => add(c)} className="tap" type="button"
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "transparent", textAlign: "left" }}>
                <Avatar name={c.name} size={28} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{c.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{c.channel === "email" ? c.email : c.phone}</span>
                </span>
                <Icon name="plus" size={15} style={{ color: "var(--accent)" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* suggestion list when empty */}
      {selected.length === 0 && q.trim() === "" && (
        <div style={{ border: "1px dashed var(--ink-250, var(--ink-300))", borderRadius: "var(--r-md)", padding: 14, background: "var(--ink-50)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="eyebrow">Suggested · this location</span>
            {pool.length > 0 && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(pool)}>Select all {pool.length}</button>
            )}
          </div>
          {pool.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-400)", textAlign: "center", padding: "8px 0" }}>No contacts for this location. Add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pool.slice(0, 4).map(c => (
                <button key={c.id} onClick={() => add(c)} className="tap focus-ring" type="button"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "var(--white)", textAlign: "left", boxShadow: "var(--shadow-xs)" }}>
                  <Avatar name={c.name} size={26} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 560 }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--ink-400)" }}>{c.channel === "email" ? c.email : c.phone}</span>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 540, color: "var(--accent-strong)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="plus" size={13} />Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------- live phone preview ---------- */
const RRPreview = ({ type, channels, channel, subject, sms, sample, location }) => {
  const def = RR_DEFAULTS[type];
  const body = fillTokens(sms && sms.trim() ? sms : def.sms, sample, location);
  const subj = fillTokens(subject && subject.trim() ? subject : def.subject, sample, location);

  return (
    <div style={{ width: 268, margin: "0 auto", borderRadius: 34, background: "#0d0d12", padding: 8, boxShadow: "var(--shadow-pop)", flex: "none" }}>
      <div style={{ borderRadius: 27, background: "var(--page)", overflow: "hidden", position: "relative", height: 472, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 106, height: 22, background: "#0d0d12", borderRadius: "0 0 14px 14px", zIndex: 5 }} />

        {channel === "sms" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 30, background: "var(--ink-100)" }}>
            <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 9, background: "var(--white)", borderBottom: "1px solid var(--ink-200)" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
              </span>
              <div><div style={{ fontSize: 12.5, fontWeight: 640 }}>Bright Smile</div><div style={{ fontSize: 10, color: "var(--ink-400)" }}>Text message · now</div></div>
            </div>
            <div style={{ padding: 14, flex: 1 }}>
              <div style={{ background: "var(--white)", border: "1px solid var(--ink-200)", borderRadius: "4px 16px 16px 16px", padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-700)", boxShadow: "var(--shadow-xs)", textWrap: "pretty" }}>
                {body}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 30, background: "var(--white)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ink-150)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-400)" }}>Bright Smile via WeHearYou</div>
              <div style={{ fontSize: 13, fontWeight: 680, marginTop: 3, letterSpacing: "-.01em", textWrap: "pretty" }}>{subj}</div>
            </div>
            <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Bright Smile</span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.55, margin: 0 }}>Hi {sample},</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.55, margin: "9px 0 0" }}>
                Thanks for choosing {location}. {type === "video" ? "Would you share a short video about your experience?" : "Would you take a moment to share your experience? It really helps."}
              </p>
              {type === "review" && (
                <div style={{ display: "flex", gap: 4, margin: "14px 0 4px" }}>
                  {[1,2,3,4,5].map(n => (
                    <svg key={n} width="22" height="22" viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="var(--star)" /></svg>
                  ))}
                </div>
              )}
              <div className="btn btn-primary" style={{ marginTop: "auto", justifyContent: "center", pointerEvents: "none" }}>
                <Icon name={type === "video" ? "film" : "star"} size={15} />{def.cta}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- summary stat row ---------- */
const SumRow = ({ label, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--ink-150)" }}>
    <span style={{ fontSize: 12.5, color: "var(--ink-400)", width: 92, flex: "none" }}>{label}</span>
    <div style={{ flex: 1, fontSize: 13, fontWeight: 540, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "flex-end", textAlign: "right" }}>{children}</div>
  </div>
);

/* ================= Page ================= */
const ReviewRequest = ({ onExit }) => {
  const real = LOCATIONS.filter(l => l.id !== "all");
  const [name, setName] = useStateR("Manual review request");
  const [type, setType] = useStateR("review");
  const [locId, setLocId] = useStateR(real[0].id);
  const [channels, setChannels] = useStateR({ sms: true, email: false });
  const [subject, setSubject] = useStateR("");
  const [sms, setSms] = useStateR("");
  const [recipients, setRecipients] = useStateR([]);
  const [previewCh, setPreviewCh] = useStateR("sms");
  const [sent, setSent] = useStateR(false);

  const location = real.find(l => l.id === locId) || real[0];
  const locName = `${location.name} · ${location.area}`;
  const sample = recipients[0] ? recipients[0].name.split(" ")[0] : "Alex";

  // keep preview channel valid
  useEffectR(() => {
    if (channels[previewCh]) return;
    setPreviewCh(channels.sms ? "sms" : channels.email ? "email" : "sms");
  }, [channels]);

  // reset recipients not in the chosen location
  useEffectR(() => {
    setRecipients(rs => rs.filter(r => r.loc === locId || r.manual));
  }, [locId]);

  const anyChannel = channels.sms || channels.email;
  const canSend = anyChannel && recipients.length > 0;
  const def = RR_DEFAULTS[type];

  const send = () => { if (!canSend) return; setSent(true); setTimeout(() => setSent(false), 2600); };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)", paddingBottom: 92 }}>
      {/* header */}
      <button onClick={() => onExit && onExit()} className="tap focus-ring" type="button"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "transparent", cursor: "pointer", color: "var(--ink-500)", fontSize: 12.5, fontWeight: 560, padding: "2px 0", marginBottom: 8 }}>
        <Icon name="chevDown" size={15} style={{ transform: "rotate(90deg)" }} />Back to campaigns
      </button>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Campaigns</div>
      <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Send review requests</h1>
      <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>Create a one-off campaign to request reviews or video testimonials from your customers.</p>

      {/* two-pane */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 348px", gap: "var(--gutter)", marginTop: "var(--gutter)" }} className="rr-grid">
        {/* LEFT — form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", minWidth: 0 }}>
          {/* 1 campaign */}
          <RCard step="1" title="Campaign" sub="Name it and choose what you're asking for.">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <RLabel>Campaign name</RLabel>
                <input className="input focus-ring" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Post-visit review request" />
              </div>
              <div>
                <RLabel>Request type</RLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="rr-2col">
                  <OptionCard on={type === "review"} onClick={() => setType("review")} icon="star" title="Review request" desc="Ask for a star review on your sites" />
                  <OptionCard on={type === "video"} onClick={() => setType("video")} icon="film" title="Video testimonial" desc="Ask for a short recorded video" />
                </div>
              </div>
            </div>
          </RCard>

          {/* 2 sending */}
          <RCard step="2" title="Sending" sub="Where it comes from and how it's delivered.">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <RLabel>Sending location</RLabel>
                <select className="input focus-ring" value={locId} onChange={e => setLocId(e.target.value)} style={{ cursor: "pointer" }}>
                  {real.map(l => <option key={l.id} value={l.id}>{l.name} · {l.area}</option>)}
                </select>
              </div>
              <div>
                <RLabel hint={!anyChannel ? "Pick at least one" : undefined}>Delivery channels</RLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="rr-2col">
                  <OptionCard kind="check" on={channels.sms} onClick={() => setChannels(c => ({ ...c, sms: !c.sms }))} icon="chat" title="SMS" desc="Text message — highest open rate" />
                  <OptionCard kind="check" on={channels.email} onClick={() => setChannels(c => ({ ...c, email: !c.email }))} icon="send" title="Email" desc="Good for longer follow-ups" />
                </div>
              </div>
            </div>
          </RCard>

          {/* 3 message */}
          <RCard step="3" title="Message" sub="Leave blank to use your location's default copy.">
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {channels.email && (
                <div>
                  <RLabel>Email subject</RLabel>
                  <input className="input focus-ring" value={subject} onChange={e => setSubject(e.target.value)} placeholder={def.subject} />
                </div>
              )}
              {channels.sms && (
                <div>
                  <RLabel hint={`${(sms || "").length}/160`}>SMS message</RLabel>
                  <textarea className="input focus-ring" rows={3} value={sms} onChange={e => setSms(e.target.value)} placeholder={def.sms}
                    style={{ height: "auto", padding: "11px 12px", resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }} />
                </div>
              )}
              {!anyChannel && <div style={{ fontSize: 12.5, color: "var(--ink-400)" }}>Select a delivery channel above to edit its message.</div>}
              {anyChannel && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-400)" }}>Insert:</span>
                  {["{first}", "{location}", "{link}"].map(tok => (
                    <button key={tok} type="button" onClick={() => (channels.sms ? setSms(v => (v || def.sms) + " " + tok) : setSubject(v => (v || def.subject) + " " + tok))}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: "1px solid var(--ink-200)", background: "var(--ink-50)", color: "var(--accent-strong)", cursor: "pointer" }}>{tok}</button>
                  ))}
                </div>
              )}
            </div>
          </RCard>

          {/* 4 recipients */}
          <RCard step="4" title="Recipients" sub="Select the contacts to include in this send."
            right={<span className="badge badge-neutral tnum">{recipients.length} selected</span>}>
            <RecipientPicker locId={locId} selected={recipients} setSelected={setRecipients} />
          </RCard>
        </div>

        {/* RIGHT — preview + summary */}
        <div className="rr-side" style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          <div style={{ position: "sticky", top: "var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* preview */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span className="badge badge-success"><span className="dot" style={{ background: "var(--success)" }} />Live preview</span>
                {channels.sms && channels.email && (
                  <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
                    {[["sms", "SMS"], ["email", "Email"]].map(([k, lbl]) => (
                      <button key={k} type="button" onClick={() => setPreviewCh(k)}
                        style={{ border: 0, cursor: "pointer", padding: "4px 11px", borderRadius: 5, fontSize: 12, fontWeight: 560,
                          background: previewCh === k ? "var(--white)" : "transparent", color: previewCh === k ? "var(--ink-900)" : "var(--ink-500)",
                          boxShadow: previewCh === k ? "var(--shadow-xs)" : "none" }}>{lbl}</button>
                    ))}
                  </div>
                )}
              </div>
              {anyChannel ? (
                <RRPreview type={type} channels={channels} channel={previewCh} subject={subject} sms={sms} sample={sample} location={location.name} />
              ) : (
                <div style={{ height: 200, display: "grid", placeItems: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center" }}>
                  Select a delivery channel<br />to preview the message.
                </div>
              )}
            </div>

            {/* summary */}
            <div className="card" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Send summary</div>
              <SumRow label="Type">
                <span className="badge badge-accent" style={{ textTransform: "capitalize" }}>{type === "video" ? "Video testimonial" : "Review request"}</span>
              </SumRow>
              <SumRow label="Location"><span style={{ color: "var(--ink-700)" }}>{location.area}</span></SumRow>
              <SumRow label="Channels">
                {channels.sms && <span className="badge badge-neutral"><Icon name="chat" size={11} />SMS</span>}
                {channels.email && <span className="badge badge-neutral"><Icon name="send" size={11} />Email</span>}
                {!anyChannel && <span style={{ color: "var(--danger)", fontSize: 12.5 }}>None</span>}
              </SumRow>
              <SumRow label="Recipients">
                <span className="tnum" style={{ fontWeight: 680, fontSize: 15, color: recipients.length ? "var(--ink-900)" : "var(--danger)" }}>{recipients.length}</span>
              </SumRow>
              <SumRow label="Est. sends">
                <span className="tnum" style={{ color: "var(--ink-600)" }}>{recipients.length * ((channels.sms ? 1 : 0) + (channels.email ? 1 : 0))}</span>
              </SumRow>
            </div>
          </div>
        </div>
      </div>

      {/* sticky footer action bar */}
      <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, marginTop: "var(--gutter)",
        background: "color-mix(in srgb, var(--white) 86%, transparent)", backdropFilter: "blur(8px)",
        borderTop: "1px solid var(--ink-200)", padding: "14px 0", marginLeft: "calc(var(--gutter) * -1)", marginRight: "calc(var(--gutter) * -1)",
        paddingLeft: "var(--gutter)", paddingRight: "var(--gutter)", display: "flex", alignItems: "center", gap: 12, zIndex: 20 }} className="rr-footer">
        <div style={{ fontSize: 12.5, color: "var(--ink-500)" }}>
          {canSend
            ? <>Ready to send to <b className="tnum" style={{ color: "var(--ink-900)" }}>{recipients.length}</b> recipient{recipients.length === 1 ? "" : "s"}</>
            : !anyChannel ? "Select a delivery channel to continue" : "Add at least one recipient to send"}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" type="button" onClick={() => onExit && onExit()}>Cancel</button>
          <button className="btn btn-secondary" type="button">Save draft</button>
          <button className={`btn ${sent ? "btn-soft" : "btn-primary"}`} type="button" onClick={send} aria-disabled={!canSend}
            style={{ opacity: canSend || sent ? 1 : 0.5, pointerEvents: canSend ? "auto" : "none" }}>
            <Icon name={sent ? "check" : "send"} size={16} />{sent ? "Requests sent" : "Send review request"}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ReviewRequest });
