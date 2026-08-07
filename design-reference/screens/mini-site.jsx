/* WeHearYou — Public Mini Site. Customer-facing location profile.
   Shared render used by the admin preview (embedded) and the full public page.
   Reads model from buildLocationModel(); respects model.settings toggles. */

const { useState: useStateMS } = React;

/* business monogram tile (stands in for uploaded logo) */
const BizLogo = ({ name, size = 72, radius = 18 }) => (
  <span style={{ width: size, height: size, borderRadius: radius, flex: "none", display: "grid", placeItems: "center",
    background: "linear-gradient(150deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #0b6))", color: "#fff",
    boxShadow: "0 10px 30px -8px color-mix(in srgb, var(--accent) 50%, transparent)", border: "3px solid #fff" }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  </span>
);

const VerifiedBadge = ({ small }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "3px 9px" : "5px 11px",
    borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-strong)", border: "1px solid var(--accent-border)",
    fontSize: small ? 11.5 : 12.5, fontWeight: 600 }}>
    <svg width={small ? 13 : 15} height={small ? 13 : 15} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 1.8 3 .1 1 2.8L21.5 9l-1 2.9.9 2.8-2.6 1.5-1.4 2.6-3-.4L12 22l-2.4-1.1-3 .4-1.4-2.6L2.6 17l.9-2.8L2.5 11.3l2-1.5L5.6 7l3-.1L11 5z" fill="currentColor" opacity=".16"/>
      <path d="M8.5 12.2l2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    Verified by WeHearYou
  </span>
);

const MSourceButton = ({ source, href = "#" }) => {
  const m = SOURCE_META[source] || { color: "var(--ink-400)", letter: "?" };
  return (
    <a href={href} className="ms-srcbtn" style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 16px",
      borderRadius: "var(--r-md)", border: "1px solid var(--ink-200)", background: "var(--white)", boxShadow: "var(--shadow-xs)",
      transition: "transform .14s, box-shadow .14s, border-color .14s" }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", background: m.color, color: "#fff",
        display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{m.letter}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 620, color: "var(--ink-900)" }}>Review on {source}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>Takes about 30 seconds</span>
      </span>
      <Icon name="arrowRight" size={16} style={{ color: "var(--ink-400)" }} />
    </a>
  );
};

/* map placeholder with grid + pin */
const MapPreview = ({ height = 200 }) => (
  <div style={{ position: "relative", height, borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--ink-200)",
    background: "linear-gradient(180deg, #eaf1f0, #e4ebea)" }}>
    <div style={{ position: "absolute", inset: 0, background: "#e9eef0",
      backgroundImage: "linear-gradient(var(--ink-200) 1px, transparent 1px), linear-gradient(90deg, var(--ink-200) 1px, transparent 1px)",
      backgroundSize: "34px 34px", opacity: .7 }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, transparent 40%, color-mix(in srgb, var(--accent) 14%, transparent))" }} />
    {/* a "road" */}
    <div style={{ position: "absolute", top: "55%", left: "-5%", right: "-5%", height: 12, background: "#fff", transform: "rotate(-7deg)", boxShadow: "0 0 0 1px var(--ink-200)" }} />
    <div style={{ position: "absolute", top: 0, bottom: 0, left: "38%", width: 9, background: "#fff", transform: "rotate(5deg)", boxShadow: "0 0 0 1px var(--ink-200)" }} />
    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-100%)", color: "var(--accent-strong)" }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" fill="var(--accent)" stroke="#fff" strokeWidth="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>
    </span>
  </div>
);

/* ============ Featured review card ============ */
const FeaturedCard = ({ r }) => (
  <div className="card ms-fcard" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 11, breakInside: "avoid" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <Avatar name={r.name} size={40} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 620 }}>{r.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
          <Stars value={r.rating} size={13} />
          <SourceTag source={r.source} showLabel={false} />
        </div>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--ink-400)", whiteSpace: "nowrap" }}>{r.date}</span>
    </div>
    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-700)", margin: 0, textWrap: "pretty" }}>{r.text}</p>
  </div>
);

const VideoCard = ({ v }) => (
  <div className="card ms-fcard" style={{ padding: 0, overflow: "hidden", breakInside: "avoid" }}>
    <div style={{ position: "relative", aspectRatio: "16/10", background: `linear-gradient(150deg, hsl(${v.hue} 50% 30%), hsl(${v.hue + 24} 55% 18%))`, display: "grid", placeItems: "center" }}>
      <span style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--ink-900)"><path d="M8 5v14l11-7z"/></svg>
      </span>
      <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }} className="tnum">{v.length}</span>
      <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Icon name="film" size={11} />Video review
      </span>
    </div>
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={v.name} size={34} />
        <div><div style={{ fontSize: 13.5, fontWeight: 620 }}>{v.name}</div><Stars value={5} size={12} /></div>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-700)", margin: "11px 0 0", fontStyle: "italic", textWrap: "pretty" }}>“{v.quote}”</p>
    </div>
  </div>
);

/* ============ section wrapper ============ */
const MSSection = ({ id, eyebrow, title, sub, children, style }) => (
  <section id={id} style={{ scrollMarginTop: 16, ...style }}>
    {(eyebrow || title) && (
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        {eyebrow && <div className="eyebrow" style={{ color: "var(--accent-strong)", marginBottom: 8 }}>{eyebrow}</div>}
        {title && <h2 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>{title}</h2>}
        {sub && <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 8, maxWidth: 560, marginInline: "auto", lineHeight: 1.55 }}>{sub}</p>}
      </div>
    )}
    {children}
  </section>
);

/* ============ Unavailable state ============ */
const MiniSiteUnavailable = ({ model }) => (
  <div style={{ minHeight: "100%", display: "grid", placeItems: "center", background: "var(--page)", padding: 40 }}>
    <div style={{ textAlign: "center", maxWidth: 420 }}>
      <span style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-400)" }}>
        <Icon name="eye" size={28} />
      </span>
      <h1 style={{ fontSize: 22, fontWeight: 680, letterSpacing: "-.02em" }}>This page isn't available yet</h1>
      <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 10, lineHeight: 1.6 }}>
        The public profile for <b>{model.name} · {model.area}</b> hasn't been published. Please check back soon.
      </p>
      <div style={{ marginTop: 22 }}><VerifiedBadge small /></div>
    </div>
  </div>
);

/* ============ Main public page ============ */
const MiniSite = ({ model, embedded = false }) => {
  const s = model.settings;
  if (!model.published && !embedded) return <MiniSiteUnavailable model={model} />;

  const cta = model.cta || { type: "review", label: "Leave a review" };
  const ctaMeta = (CTA_TYPES.find(c => c.key === cta.type) || CTA_TYPES[0]);
  const enabledSources = (model.sources || []).filter(Boolean);
  const pad = embedded ? "0 32px" : "0 24px";

  return (
    <div style={{ background: "var(--page)", minHeight: "100%", color: "var(--ink-900)", fontFamily: "var(--font-sans)", paddingBottom: 56 }}>
      {/* ===== HERO ===== */}
      <div style={{ position: "relative" }}>
        {/* cover */}
        <div style={{ height: embedded ? 200 : 240, background: `linear-gradient(120deg, hsl(${model.hue} 48% 32%), hsl(${model.hue + 26} 52% 20%))`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 78% 18%, rgba(255,255,255,.18), transparent 45%)" }} />
          <div style={{ position: "absolute", top: 16, right: 20 }}>
            {s.showVerified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999,
                background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8.5 12.2l2.3 2.3 4.7-4.9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.4" opacity=".6"/></svg>
                Verified by WeHearYou
              </span>
            )}
          </div>
        </div>

        {/* identity row overlapping cover */}
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: pad }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: -42, flexWrap: "wrap" }} className="ms-herorow">
            <BizLogo name={model.name} size={88} radius={22} />
            <div style={{ flex: 1, minWidth: 220, paddingBottom: 4 }}>
              <h1 style={{ fontSize: embedded ? 28 : 32, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.05 }}>{model.headline}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <Stars value={model.rating} size={17} />
                  <span className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{model.rating}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink-500)" }} className="tnum">({model.reviews.toLocaleString()} reviews)</span>
                </span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink-300)" }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13.5, color: "var(--ink-500)" }}><Icon name="pin" size={14} />{model.city.split(",")[0]}, {model.city.split(",")[1] || ""}</span>
                {s.showSources && <SourceDotsMS sources={enabledSources} />}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <a href="#leave-review" className="btn btn-primary" style={{ height: 44, padding: "0 20px", fontSize: 14.5, borderRadius: "var(--r-md)" }}>
              <Icon name={ctaMeta.icon} size={17} />{cta.label}
            </a>
            <a href={`https://${model.website}`} className="btn btn-secondary" style={{ height: 44, padding: "0 18px", fontSize: 14, borderRadius: "var(--r-md)" }}>
              <Icon name="external" size={16} />Visit website
            </a>
            <a href="#reviews" className="btn btn-secondary" style={{ height: 44, padding: "0 18px", fontSize: 14, borderRadius: "var(--r-md)" }}>
              <Icon name="star" size={16} />View reviews
            </a>
            <a href="#location" className="btn btn-ghost" style={{ height: 44, padding: "0 14px", fontSize: 14 }}>
              <Icon name="pin" size={16} />Directions
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: pad, marginTop: embedded ? 32 : 40, display: "flex", flexDirection: "column", gap: embedded ? 40 : 56 }}>

        {/* ===== TRUST SUMMARY ===== */}
        {s.showReviewSummary && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ms-trust" style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
              <div style={{ padding: "26px 24px", background: "linear-gradient(160deg, var(--accent-softer), var(--white))", borderRight: "1px solid var(--ink-150)", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="tnum" style={{ fontSize: 52, fontWeight: 720, letterSpacing: "-.03em", lineHeight: 1 }}>{model.rating}</div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}><Stars value={model.rating} size={18} /></div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 10 }} className="tnum">{model.reviews.toLocaleString()} reviews</div>
                <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, fontWeight: 560, display: "inline-flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  <Icon name="arrowUp" size={12} />{model.newThisMonth} new this month
                </div>
              </div>
              <div style={{ padding: "26px 26px" }}>
                <div className="eyebrow" style={{ color: "var(--accent-strong)", marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="sparkle" size={13} />What customers say
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-700)", margin: 0, textWrap: "pretty" }}>{AI_SUMMARY.text}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  {model.highlights.map(h => (
                    <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999,
                      background: "var(--ink-50)", border: "1px solid var(--ink-200)", fontSize: 12.5, fontWeight: 540, color: "var(--ink-700)" }}>
                      <Icon name="check" size={12} style={{ color: "var(--accent)" }} />{h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== FEATURED REVIEWS ===== */}
        {s.showFeatured && (
          <MSSection id="reviews" eyebrow="Reviews" title="What people are saying" sub={`Real, verified reviews from ${model.area} customers across Google, Facebook, Yelp and more.`}>
            <div className="ms-reviews-grid" style={{ columnGap: 18, columnCount: embedded ? 2 : 3 }}>
              {s.showVideo && model.video && <div style={{ marginBottom: 18 }}><VideoCard v={model.video} /></div>}
              {model.featured.map(r => <div key={r.id} style={{ marginBottom: 18 }}><FeaturedCard r={r} /></div>)}
            </div>
          </MSSection>
        )}

        {/* ===== LEAVE A REVIEW ===== */}
        <MSSection id="leave-review">
          <div className="card" style={{ padding: embedded ? 28 : 36, background: "linear-gradient(160deg, var(--accent-softer), var(--white))", textAlign: "center" }}>
            <div className="eyebrow" style={{ color: "var(--accent-strong)", marginBottom: 8 }}>Share your experience</div>
            <h2 style={{ fontSize: 25, fontWeight: 680, letterSpacing: "-.02em" }}>Had a great visit? Tell others.</h2>
            <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 8, maxWidth: 480, marginInline: "auto", lineHeight: 1.55 }}>
              It takes less than a minute and helps your neighbors find great care. Choose where you'd like to leave a review.
            </p>
            <div className="ms-srcgrid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(enabledSources.length, 2)}, 1fr)`, gap: 12, marginTop: 22, maxWidth: 560, marginInline: "auto" }}>
              {enabledSources.map(src => <MSourceButton key={src} source={src} />)}
            </div>
          </div>
        </MSSection>

        {/* ===== LOCATION INFO ===== */}
        <MSSection id="location" eyebrow="Visit us" title="Location & hours">
          <div className="ms-info" style={{ display: "grid", gridTemplateColumns: s.showMap ? "1.2fr 1fr" : "1fr", gap: 18, alignItems: "start" }}>
            {s.showMap && (
              <div className="card" style={{ padding: 16 }}>
                <MapPreview height={embedded ? 200 : 240} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14 }}>
                  <Icon name="pin" size={18} style={{ color: "var(--accent)", marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{model.address}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>{model.city}</div>
                  </div>
                  <a href="#" className="btn btn-secondary btn-sm"><Icon name="arrowRight" size={14} />Directions</a>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <a href={`tel:${model.phone}`} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="phone" size={16} /></span>
                    <span><span style={{ display: "block", fontSize: 11, color: "var(--ink-400)" }}>Call</span><span style={{ fontSize: 13.5, fontWeight: 560 }}>{model.phone}</span></span>
                  </a>
                  <a href={`https://${model.website}`} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="external" size={16} /></span>
                    <span><span style={{ display: "block", fontSize: 11, color: "var(--ink-400)" }}>Website</span><span style={{ fontSize: 13.5, fontWeight: 560 }}>{model.website}</span></span>
                  </a>
                </div>
              </div>
              {s.showHours && (
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Icon name="clock" size={15} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: 13.5, fontWeight: 620 }}>Hours</span>
                    <span className="badge badge-success" style={{ marginLeft: "auto" }}><span className="dot" style={{ background: "var(--success)" }} />Open now</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {model.hours.map(h => (
                      <div key={h.d} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.8 }}>
                        <span style={{ color: "var(--ink-500)" }}>{h.d}</span>
                        <span style={{ fontWeight: 540, color: h.closed ? "var(--ink-400)" : "var(--ink-800)" }}>{h.h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* services */}
          {model.services && model.services.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Services</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {model.services.map(sv => (
                  <span key={sv} style={{ padding: "7px 14px", borderRadius: 999, background: "var(--white)", border: "1px solid var(--ink-200)", fontSize: 13, fontWeight: 540, color: "var(--ink-700)", boxShadow: "var(--shadow-xs)" }}>{sv}</span>
                ))}
              </div>
            </div>
          )}
        </MSSection>

        {/* ===== FOOTER ===== */}
        <footer style={{ borderTop: "1px solid var(--ink-200)", paddingTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BizLogo name={model.name} size={40} radius={11} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 620 }}>{model.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-400)" }}>{model.area} · {model.city.split(",")[0]}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {s.showVerified && <VerifiedBadge small />}
            {s.showPoweredBy && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-400)" }}>
                Powered by
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ink-600)", fontWeight: 600 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: "var(--accent)", display: "grid", placeItems: "center" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
                  </span>
                  WeHearYou
                </span>
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

/* source dots tuned for the public hero (no border clash on dark) */
const SourceDotsMS = ({ sources = [] }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    {sources.map(src => {
      const m = SOURCE_META[src] || { color: "var(--ink-400)", letter: "?" };
      return <span key={src} title={src} style={{ width: 22, height: 22, borderRadius: 6, background: m.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{m.letter}</span>;
    })}
  </span>
);

Object.assign(window, { MiniSite, MiniSiteUnavailable, BizLogo, VerifiedBadge });
