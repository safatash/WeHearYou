/* GBP Manager — Google Posts manager + Post scheduler.
   Post types: Update / Event / Offer. Product posts are intentionally NOT
   offered — Google does not support creating them via the API.
   Publishing or scheduling is a Google API write → gated behind ConfirmWrite. */

const { useState: useStatePO, useEffect: useEffectPO } = React;

const POST_FILTERS = ["All", "Live", "Scheduled", "Draft", "Pending review"];

/* ---------- Post composer ---------- */
const PostComposer = ({ onClose, onPublish, onSchedule, initial }) => {
  const [type, setType] = useStatePO(initial?.topicType || "STANDARD");
  const [title, setTitle] = useStatePO(initial?.title || "");
  const [body, setBody] = useStatePO(initial?.summary || "");
  const [cta, setCta] = useStatePO("Learn more");
  const [loc, setLoc] = useStatePO("dt");
  const [mode, setMode] = useStatePO("publish"); // publish | schedule
  const [when, setWhen] = useStatePO("");
  const [code, setCode] = useStatePO(initial?.couponCode || "");
  const [redeemLink, setRedeemLink] = useStatePO(initial?.redeemLink || "");
  const [terms, setTerms] = useStatePO(initial?.terms || "");
  const [offerStart, setOfferStart] = useStatePO(initial?.offerStart || "");
  const [offerEnd, setOfferEnd] = useStatePO(initial?.offerEnd || "");
  const [confirm, setConfirm] = useStatePO(false);
  const fire = useToast();
  const isEdit = !!initial;

  const meta = POST_TYPES.find(p => p.key === type);
  const locName = type === "OFFER" || type === "EVENT" || true ? (GBP_LOCATIONS.find(l => l.id === loc)?.area) : "";
  const valid = body.trim().length > 5;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(12,12,16,.5)", backdropFilter: "blur(3px)", display: "flex", justifyContent: "flex-end", animation: "fade .16s ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(860px, 96vw)", height: "100%", background: "var(--white)", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,.28)", animation: "slideIn .24s cubic-bezier(.2,.7,.2,1) both" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid var(--ink-200)" }}>
          <Icon name="megaphone" size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ fontSize: 16.5, fontWeight: 660 }}>{isEdit ? "Edit post" : "New Google post"}</h2>
          <button className="btn btn-soft btn-sm" onClick={() => { setTitle(t => t || "Now offering same-day crowns"); setBody("Skip the second visit — our in-office scanner mills your crown in about an hour. Ask us at your next cleaning."); fire("Drafted with AI — review before publishing"); }}><Icon name="sparkle" size={13} />Draft with AI</button>
          <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 360px", minHeight: 0 }} className="post-composer-grid">
          {/* form */}
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18, borderRight: "1px solid var(--ink-150)" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Post type</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
                {POST_TYPES.map(p => (
                  <button key={p.key} onClick={() => setType(p.key)} className="tap" style={{ textAlign: "left", padding: 12, borderRadius: "var(--r-md)", cursor: "pointer",
                    border: type === p.key ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: type === p.key ? "var(--accent-softer)" : "var(--white)" }}>
                    <Icon name={p.icon} size={17} style={{ color: type === p.key ? "var(--accent-strong)" : "var(--ink-500)" }} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="info" size={12} />Product posts aren't available — Google doesn't support creating them via the API.
              </p>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Location</span>
              <div className="ld-affix" style={{ paddingRight: 8 }}>
                <Icon name="pin" size={15} style={{ color: "var(--ink-400)", flex: "none" }} />
                <select value={loc} onChange={e => setLoc(e.target.value)} className="ld-affix-input" style={{ appearance: "none", cursor: "pointer", background: "transparent", border: 0 }}>
                  {GBP_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.title} · {l.area}</option>)}
                  <option value="all">All locations</option>
                </select>
                <Icon name="chevDown" size={15} style={{ color: "var(--ink-400)", flex: "none" }} />
              </div>
            </label>

            {type === "OFFER" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Offer title</span>
                <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="$99 New Patient Exam" />
              </label>
            )}
            {type === "EVENT" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Event title</span>
                <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Free Kids' Dental Day" />
              </label>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>
                <span>Post text</span><span style={{ color: "var(--ink-400)", fontWeight: 400 }} className="tnum">{body.length}/1500</span>
              </span>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={1500} className="input" placeholder="Share an update, news, or what's new…"
                style={{ height: "auto", padding: "11px 12px", lineHeight: 1.55, resize: "vertical" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: type === "OFFER" ? "1fr 1fr" : "1fr", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Button (call to action)</span>
                <div className="ld-affix" style={{ paddingRight: 8 }}>
                  <select value={cta} onChange={e => setCta(e.target.value)} className="ld-affix-input" style={{ appearance: "none", cursor: "pointer", background: "transparent", border: 0 }}>
                    {POST_CTAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Icon name="chevDown" size={15} style={{ color: "var(--ink-400)", flex: "none" }} />
                </div>
              </label>
              {type === "OFFER" && (
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Coupon code</span>
                  <input value={code} onChange={e => setCode(e.target.value)} className="input mono" placeholder="SMILE99" />
                </label>
              )}
            </div>

            {type === "OFFER" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 9 }}>Offer period</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Starts</span>
                      <input type="datetime-local" value={offerStart} onChange={e => setOfferStart(e.target.value)} className="input" />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Ends</span>
                      <input type="datetime-local" value={offerEnd} onChange={e => setOfferEnd(e.target.value)} className="input" min={offerStart || undefined} />
                    </label>
                  </div>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Link to redeem offer</span>
                  <input value={redeemLink} onChange={e => setRedeemLink(e.target.value)} className="input" placeholder="https://yoursite.com/offer" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Terms & conditions</span>
                  <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className="input" placeholder="Redeemable in-office only. One per customer. Cannot combine with other offers."
                    style={{ height: "auto", padding: "11px 12px", lineHeight: 1.5, resize: "vertical" }} />
                </label>
              </div>
            )}

            <div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Photo</div>
              <div style={{ height: 100, borderRadius: "var(--r-md)", border: "1.5px dashed var(--ink-300)", display: "grid", placeItems: "center", color: "var(--ink-400)", cursor: "pointer", background: "var(--ink-50)" }}>
                <div style={{ textAlign: "center" }}><Icon name="image" size={20} /><div style={{ fontSize: 12, marginTop: 4 }}>Drag a photo or click to upload</div></div>
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Publish</div>
              <div className="seg" style={{ marginBottom: 12 }}>
                <button data-active={mode === "publish"} onClick={() => setMode("publish")}><Icon name="zap" size={14} />Publish now</button>
                <button data-active={mode === "schedule"} onClick={() => setMode("schedule")}><Icon name="calClock" size={14} />Schedule</button>
              </div>
              {mode === "schedule" && (
                <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="input" />
              )}
            </div>
          </div>

          {/* preview */}
          <div style={{ padding: 22, background: "var(--ink-50)" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Preview on Google</div>
            <div className="card" style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
              <div style={{ height: 132, background: `linear-gradient(135deg, hsl(${meta ? 200 : 200} 48% 40%), hsl(220 52% 26%))`, display: "grid", placeItems: "center", color: "rgba(255,255,255,.6)" }}>
                <Icon name="image" size={26} />
              </div>
              <div style={{ padding: 14 }}>
                {(type === "OFFER" || type === "EVENT") && title && <div style={{ fontSize: 14, fontWeight: 680, marginBottom: 5 }}>{title}</div>}
                {type === "OFFER" && <span className="badge badge-accent" style={{ marginBottom: 8 }}><Icon name="gift" size={11} />Offer{code && ` · ${code}`}</span>}
                {type === "EVENT" && <span className="badge badge-accent" style={{ marginBottom: 8 }}><Icon name="calendar" size={11} />Event</span>}
                {type === "OFFER" && (offerStart || offerEnd) && (
                  <div style={{ fontSize: 11, color: "var(--ink-500)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="calClock" size={12} />{offerStart ? offerStart.replace("T", " ") : "…"} \u2192 {offerEnd ? offerEnd.replace("T", " ") : "…"}
                  </div>
                )}
                <p style={{ fontSize: 12.8, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>{body || "Your post text will appear here…"}</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 11, color: "var(--src-google)", borderColor: "var(--ink-200)" }}>{cta}<Icon name="arrowUpRight" size={13} /></button>
                {type === "OFFER" && terms && <p style={{ fontSize: 10.5, color: "var(--ink-400)", marginTop: 9, lineHeight: 1.5 }}>{terms}</p>}
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 12, lineHeight: 1.5, display: "flex", gap: 6 }}>
              <Icon name="info" size={13} style={{ flex: "none", marginTop: 1 }} />Live posts appear on your Business Profile in Search and Maps. Standard posts expire after ~7 days unless renewed.
            </p>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--ink-200)" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="lock" size={12} />Nothing is sent to Google until you confirm</span>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="btn btn-secondary" disabled={!valid} onClick={() => { onPublish({ draft: true }); fire("Saved as draft (not published)"); onClose(); }}>Save draft</button>
          <button className="btn btn-primary" disabled={!valid || (mode === "schedule" && !when)} onClick={() => setConfirm(true)}>
            <Icon name={mode === "schedule" ? "calClock" : "zap"} size={15} />{isEdit ? "Save changes" : (mode === "schedule" ? "Schedule post" : "Publish now")}
          </button>
        </div>

        <ConfirmWrite open={confirm} onClose={() => setConfirm(false)}
          title={mode === "schedule" ? "Schedule this post?" : "Publish this post to Google?"}
          intent={mode === "schedule" ? "queue a post to publish later" : "publish a post"}
          target={locName || "All locations"}
          method="POST accounts.locations.localPosts.create"
          confirmLabel={mode === "schedule" ? "Confirm & schedule" : "Confirm & publish"}
          onConfirm={() => { setConfirm(false); mode === "schedule" ? onSchedule({ title, body, type, when }) : onPublish({ title, body, type }); fire(mode === "schedule" ? "Post scheduled" : "Post published to Google Business Profile"); onClose(); }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5 }}>
            <b>{POST_TYPES.find(p => p.key === type)?.label}</b>{title ? ` · ${title}` : ""}{mode === "schedule" && when ? ` · ${when.replace("T", " ")}` : ""}
          </div>
        </ConfirmWrite>
      </div>
    </div>
  );
};

/* ---------- Post details modal ---------- */
const PostDetails = ({ p, onClose, onEdit }) => {
  const sm = POST_STATE_META[p.state];
  const typeMeta = POST_TYPES.find(t => t.key === p.topicType);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(12,12,16,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", animation: "fade .16s ease both" }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "min(480px, 92vw)", padding: 0, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 140, background: p.media ? `linear-gradient(135deg, hsl(${p.hue} 46% 40%), hsl(${p.hue + 24} 52% 26%))` : "var(--ink-100)", display: "grid", placeItems: "center", color: p.media ? "rgba(255,255,255,.55)" : "var(--ink-300)", position: "relative" }}>
          <Icon name={p.media ? "image" : "fileText"} size={26} />
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm" style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,.85)" }}><Icon name="close" size={15} /></button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span className={"badge " + sm.cls}><span className="dot" style={{ background: sm.dot }} />{sm.label}</span>
            <span className="badge badge-neutral"><Icon name={typeMeta?.icon} size={11} />{typeMeta?.label}</span>
            <LocPill loc={p.loc} />
            {p.aiGenerated && <AIBadge />}
          </div>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 660, marginBottom: 6 }}>{p.title}</div>
            <p style={{ fontSize: 13, color: "var(--ink-600)", lineHeight: 1.55, textWrap: "pretty" }}>{p.summary}</p>
          </div>
          {p.state === "LIVE" ? (
            <div style={{ display: "flex", gap: 18, paddingTop: 10, borderTop: "1px solid var(--ink-150)" }}>
              <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-500)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="eye" size={14} />{p.views.toLocaleString()} views</span>
              <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-500)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="arrowUpRight" size={14} />{p.clicks} clicks</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-400)", paddingTop: 10, borderTop: "1px solid var(--ink-150)" }}>{p.scheduleTime ? `Scheduled for ${p.scheduleTime}` : p.publishTime ? `Published ${p.publishTime}` : "Not published"}</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => { onClose(); onEdit(p); }}><Icon name="edit" size={14} />Edit post</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Post card ---------- */
const PostCard = ({ p, onEdit, onDuplicate, onDelete }) => {
  const [menu, setMenu] = useStatePO(false);
  const [details, setDetails] = useStatePO(false);
  const menuRef = React.useRef(null);
  useEffectPO(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const sm = POST_STATE_META[p.state];
  const typeMeta = POST_TYPES.find(t => t.key === p.topicType);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 110, background: p.media ? `linear-gradient(135deg, hsl(${p.hue} 46% 40%), hsl(${p.hue + 24} 52% 26%))` : "var(--ink-100)", display: "grid", placeItems: "center", color: p.media ? "rgba(255,255,255,.55)" : "var(--ink-300)", position: "relative" }}>
        <Icon name={p.media ? "image" : "fileText"} size={24} />
        <span style={{ position: "absolute", top: 10, left: 10 }} className={"badge " + sm.cls}><span className="dot" style={{ background: sm.dot }} />{sm.label}</span>
        <span style={{ position: "absolute", top: 10, right: 10 }} className="badge badge-neutral"><Icon name={typeMeta?.icon} size={11} />{typeMeta?.label}</span>
      </div>
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <LocPill loc={p.loc} />
          {p.aiGenerated && <AIBadge />}
        </div>
        <div style={{ fontSize: 13.8, fontWeight: 640, marginBottom: 5, letterSpacing: "-.01em" }}>{p.title}</div>
        <p style={{ fontSize: 12.6, color: "var(--ink-500)", lineHeight: 1.5, flex: 1, textWrap: "pretty", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.summary}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ink-150)" }}>
          {p.state === "LIVE" ? (
            <>
              <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="eye" size={13} />{p.views.toLocaleString()}</span>
              <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="arrowUpRight" size={13} />{p.clicks}</span>
            </>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{p.scheduleTime || p.publishTime || "Not published"}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => onEdit(p)}><Icon name="edit" size={14} /></button>
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setMenu(m => !m)} className="btn btn-ghost btn-sm btn-icon" title="More"><Icon name="dots" size={14} /></button>
              {menu && (
                <div className="card" style={{ position: "absolute", bottom: "calc(100% + 4px)", right: 0, width: 168, padding: 5, boxShadow: "var(--shadow-pop)", zIndex: 40, animation: "pop .14s ease both" }}>
                  {[
                    { label: "View details", icon: "eye", fn: () => setDetails(true) },
                    { label: "Edit", icon: "edit", fn: () => onEdit(p) },
                    { label: "Duplicate", icon: "copy", fn: () => onDuplicate(p) },
                    { label: "Delete", icon: "trash", fn: () => onDelete(p), danger: true },
                  ].map(a => (
                    <button key={a.label} onClick={() => { setMenu(false); a.fn(); }} className="tap"
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer",
                        background: "transparent", textAlign: "left", fontSize: 13, fontWeight: 520, color: a.danger ? "var(--danger)" : "var(--ink-700)" }}>
                      <Icon name={a.icon} size={15} />{a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {details && <PostDetails p={p} onClose={() => setDetails(false)} onEdit={onEdit} />}
    </div>
  );
};

const GBPPosts = ({ go }) => {
  const [filter, setFilter] = useStatePO("All");
  const [composer, setComposer] = useStatePO(false);
  const [editing, setEditing] = useStatePO(null);
  const [posts, setPosts] = useStatePO(GBP_POSTS);
  const fire = useToast();

  const stateOf = { "Live": "LIVE", "Scheduled": "SCHEDULED", "Draft": "DRAFT", "Pending review": "PENDING" };
  const filtered = posts.filter(p => filter === "All" || p.state === stateOf[filter]);
  const live = posts.filter(p => p.state === "LIVE").length;

  const onDuplicate = (p) => { setPosts(ps => [{ ...p, id: p.id + "-copy-" + Date.now(), title: p.title + " (copy)", state: "DRAFT" }, ...ps]); fire("Post duplicated as draft"); };
  const onDelete = (p) => { setPosts(ps => ps.filter(x => x.id !== p.id)); fire("Post deleted"); };

  return (
    <Page>
      <PageHeader eyebrow="Content" title="Google Posts"
        sub="Updates, events, and offers that show on your Business Profile in Search and Maps."
        actions={<>
          <button className="btn btn-secondary" onClick={() => go("scheduler")}><Icon name="calendar" size={16} />Scheduler</button>
          <button className="btn btn-primary" onClick={() => setComposer(true)}><Icon name="plus" size={16} />New post</button>
        </>}
      />

      <div style={{ display: "flex", gap: "var(--gutter)", marginBottom: "var(--gutter)", flexWrap: "wrap" }}>
        {[["Live posts", live, "megaphone"], ["Scheduled", posts.filter(p => p.state === "SCHEDULED").length, "calClock"], ["Drafts", posts.filter(p => p.state === "DRAFT").length, "fileText"], ["Avg. clicks / post", "114", "arrowUpRight"]].map(([k, v, ic]) => (
          <div key={k} className="card" style={{ flex: 1, minWidth: 150, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}><Icon name={ic} size={16} /></span>
            <div><div className="tnum" style={{ fontSize: 20, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 11, color: "var(--ink-400)" }}>{k}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {POST_FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} className="chip" data-active={filter === f}>{f}</button>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--gutter)" }}>
        {filtered.map(p => <PostCard key={p.id} p={p} onEdit={setEditing} onDuplicate={onDuplicate} onDelete={onDelete} />)}
      </div>

      {composer && <PostComposer onClose={() => setComposer(false)} onPublish={() => {}} onSchedule={() => {}} />}
      {editing && <PostComposer initial={editing} onClose={() => setEditing(null)} onPublish={() => {}} onSchedule={() => {}} />}
    </Page>
  );
};

/* ============ Scheduler ============ */
const MONTH = { name: "July 2026", first: 3 /* Wed */, days: 31 };
const GBPScheduler = ({ go }) => {
  const [composer, setComposer] = useStatePO(false);
  const [editing, setEditing] = useStatePO(null);
  const fire = useToast();
  const byDate = {};
  GBP_SCHEDULE.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

  const cells = [];
  for (let i = 0; i < MONTH.first; i++) cells.push(null);
  for (let d = 1; d <= MONTH.days; d++) cells.push(d);

  const typeColor = { OFFER: "var(--accent)", EVENT: "var(--success)", STANDARD: "var(--ink-500)" };

  return (
    <Page>
      <PageHeader eyebrow="Content" title="Post scheduler"
        sub="Plan your Google posts ahead. Scheduled posts publish automatically at their time — but only ones you've already confirmed."
        actions={<>
          <button className="btn btn-secondary" onClick={() => go("posts")}><Icon name="megaphone" size={16} />All posts</button>
          <button className="btn btn-primary" onClick={() => setComposer(true)}><Icon name="plus" size={16} />Schedule post</button>
        </>}
      />

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: "var(--gutter)", alignItems: "start" }}>
        {/* calendar */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button className="btn btn-ghost btn-sm btn-icon"><Icon name="chevRight" size={16} style={{ transform: "rotate(180deg)" }} /></button>
            <h3 style={{ fontSize: 15.5, fontWeight: 660 }}>{MONTH.name}</h3>
            <button className="btn btn-ghost btn-sm btn-icon"><Icon name="chevRight" size={16} /></button>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>Today</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="eyebrow" style={{ textAlign: "center", padding: "2px 0" }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              const date = d ? `2026-07-${String(d).padStart(2, "0")}` : null;
              const items = date ? byDate[date] || [] : [];
              return (
                <div key={i} style={{ minHeight: 72, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-150)", padding: 6, background: d ? "var(--white)" : "transparent", opacity: d ? 1 : 0 }}>
                  {d && <div className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)", marginBottom: 4 }}>{d}</div>}
                  {items.map(it => (
                    <div key={it.id} title={it.title} style={{ fontSize: 10.5, padding: "3px 5px", borderRadius: 5, marginBottom: 3, background: `color-mix(in srgb, ${typeColor[it.topicType]} 12%, #fff)`, color: typeColor[it.topicType], fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: typeColor[it.topicType], flex: "none" }} />{it.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* upcoming queue */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Upcoming queue" sub={`${GBP_SCHEDULE.length} scheduled`} />
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {GBP_SCHEDULE.map(s => {
              const tm = POST_TYPES.find(t => t.key === s.topicType);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 4px", borderTop: "1px solid var(--ink-150)" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}><Icon name={tm?.icon} size={15} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.8, fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{s.loc} · {new Date(s.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {s.time}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => setEditing(s)}><Icon name="edit" size={14} /></button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <GatedNotice icon="lock">Auto-publishing only runs for posts you've already reviewed and confirmed. You can pause the queue anytime.</GatedNotice>
          </div>
        </div>
      </div>

      {composer && <PostComposer onClose={() => setComposer(false)} onPublish={() => {}} onSchedule={() => {}} />}
      {editing && <PostComposer initial={editing} onClose={() => setEditing(null)} onPublish={() => {}} onSchedule={() => {}} />}
    </Page>
  );
};

Object.assign(window, { GBPPosts, GBPScheduler });
