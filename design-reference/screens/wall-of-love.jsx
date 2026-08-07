/* WeHearYou — Wall of Love: dedicated, tabbed customize panel (replaces the flat control list for the grid widget type) */
const { useState: useStateWL } = React;

const WOL_TABS = [
  { id: "content", label: "Content", icon: "inbox" },
  { id: "style", label: "Style", icon: "palette" },
  { id: "layout", label: "Layout", icon: "layers" },
  { id: "display", label: "Display", icon: "eye" },
  { id: "type", label: "Typography", icon: "edit" },
  { id: "spotlight", label: "Spotlight", icon: "sparkle" },
];

const TabRail = ({ value, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, background: "var(--ink-100)", borderRadius: "var(--r-md)" }}>
    {WOL_TABS.map(t => {
      const active = value === t.id;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} className="tap"
          style={{ display: "flex", alignItems: "center", gap: 6, border: 0, cursor: "pointer", padding: "7px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 580,
            background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)",
            boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s" }}>
          <Icon name={t.icon} size={14}/>{t.label}
        </button>
      );
    })}
  </div>
);

const ChipRow = ({ value, options, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {options.map(o => {
      const active = String(value) === String(o);
      return (
        <button key={o} onClick={() => onChange(o)} className="tap"
          style={{ minWidth: 34, padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
            border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
            background: active ? "var(--accent-softer)" : "var(--white)", color: active ? "var(--accent-strong)" : "var(--ink-600)" }}>
          {o}
        </button>
      );
    })}
  </div>
);

/* searchable single/multi review picker used by Spotlight & Pins */
const ReviewPicker = ({ mode = "single", value, onToggle, accent }) => {
  const [q, setQ] = useStateWL("");
  const pool = REVIEWS.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.text.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const isSel = (id) => mode === "single" ? value === id : (value || []).includes(id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search reviews…" style={{ width: "100%" }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {pool.map(r => {
          const sel = isSel(r.id);
          return (
            <button key={r.id} onClick={() => onToggle(r.id)} className="tap"
              style={{ textAlign: "left", cursor: "pointer", border: sel ? `1.5px solid ${accent}` : "1px solid var(--ink-200)",
                background: sel ? "var(--accent-softer)" : "var(--white)", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 8 }}>
              <Stars value={r.rating} size={11}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 620, color: "var(--ink-800)" }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
              </div>
              {sel && <Icon name="check" size={14} style={{ color: accent, flex: "none" }}/>}
            </button>
          );
        })}
        {pool.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-400)", padding: "10px 2px" }}>No reviews match “{q}”.</div>}
      </div>
    </div>
  );
};

/* quote-highlight rows: pick a review, paste the exact phrase to mark in the accent color */
const HighlightEditor = ({ highlights, onChange, accent }) => {
  const [adding, setAdding] = useStateWL(false);
  const [reviewId, setReviewId] = useStateWL(null);
  const [phrase, setPhrase] = useStateWL("");
  const add = () => {
    if (!reviewId || !phrase.trim()) return;
    onChange([...highlights.filter(h => h.reviewId !== reviewId), { reviewId, phrase: phrase.trim() }]);
    setAdding(false); setReviewId(null); setPhrase("");
  };
  const remove = (id) => onChange(highlights.filter(h => h.reviewId !== id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {highlights.map(h => {
        const r = REVIEWS.find(x => x.id === h.reviewId);
        if (!r) return null;
        return (
          <div key={h.reviewId} style={{ border: "1px solid var(--ink-200)", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 620, color: "var(--ink-800)" }}>{r.name}</span>
              <button onClick={() => remove(h.reviewId)} className="btn btn-ghost btn-icon btn-sm" style={{ width: 22, height: 22 }}><Icon name="close" size={13}/></button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink-600)" }}>
              “<mark style={{ background: "color-mix(in srgb, " + accent + " 24%, transparent)", borderRadius: 3, padding: "0 2px" }}>{h.phrase}</mark>”
            </div>
          </div>
        );
      })}
      {adding ? (
        <div style={{ border: "1px solid var(--ink-200)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <ReviewPicker mode="single" value={reviewId} onToggle={setReviewId} accent={accent}/>
          <textarea className="input" rows={2} value={phrase} onChange={e => setPhrase(e.target.value)}
            placeholder="Paste the exact phrase to highlight…" style={{ width: "100%", height: "auto", padding: "9px 12px", resize: "vertical", fontFamily: "inherit" }}/>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={add} disabled={!reviewId || !phrase.trim()}>Add highlight</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setReviewId(null); setPhrase(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}><Icon name="plus" size={13}/>Add highlight</button>
      )}
    </div>
  );
};

const MAX_REVIEW_OPTS = [2, 4, 6, 8, 10, 12, 16];

const WallCustomizePanel = ({ s, set, setSrc, setDeep }) => {
  const [tab, setTab] = useStateWL("content");
  const setType = (k, v) => setDeep("typeSize", { ...s.typeSize, [k]: v });
  const togglePin = (id) => set("pinnedIds", (s.pinnedIds||[]).includes(id) ? s.pinnedIds.filter(x => x !== id) : [...(s.pinnedIds||[]), id]);

  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: "var(--gutter)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="sliders" size={16} style={{ color: "var(--accent)" }}/>
        <span style={{ fontSize: 14, fontWeight: 640 }}>Customize</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{s.active ? "Active" : "Paused"}</span>
          <Toggle checked={s.active} onChange={v => set("active", v)}/>
        </div>
      </div>

      <TabRail value={tab} onChange={setTab}/>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "calc(100vh - 260px)", overflowY: "auto", paddingRight: 2 }}>
        {tab === "content" && (
          <>
            <Field label="Location">
              <select className="input" value={s.location} onChange={e => set("location", e.target.value)} style={{ width: "100%" }}>
                {LOCATIONS.filter(l => l.id !== "all").map(l => <option key={l.id} value={l.name + " — " + l.area}>{l.name} — {l.area}</option>)}
              </select>
            </Field>
            <Field label="Header title">
              <input className="input" value={s.wallTitle} onChange={e => set("wallTitle", e.target.value)} style={{ width: "100%" }}/>
            </Field>
            <Field label="Header subtitle">
              <input className="input" value={s.wallSubtitle} onChange={e => set("wallSubtitle", e.target.value)} style={{ width: "100%" }}/>
            </Field>
            <Field label="Content">
              <Segmented value={s.content} onChange={v => set("content", v)}
                options={[{value:"reviews",label:"Reviews"},{value:"videos",label:"Videos"},{value:"mixed",label:"Mixed"}]}/>
            </Field>
            <Field label="Sources">
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {Object.keys(s.sources).map(src => (
                  <div key={src} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: (SOURCE_META[src]||{}).color, color: "#fff", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)", flex: "none" }}>{(SOURCE_META[src]||{}).letter}</span>
                    <span style={{ fontSize: 13, color: "var(--ink-700)", flex: 1 }}>{src}</span>
                    <Toggle checked={s.sources[src]} onChange={v => setSrc(src, v)}/>
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Minimum rating" hint={`${s.minRating}★ and up`}>
              <Slider value={s.minRating} min={1} max={5} onChange={v => set("minRating", v)}/>
            </Field>
            <Field label="Max reviews shown" hint={`${s.maxReviews}`}>
              <ChipRow value={s.maxReviews} options={MAX_REVIEW_OPTS} onChange={v => set("maxReviews", v)}/>
            </Field>
          </>
        )}

        {tab === "style" && (
          <>
            <Field label="Appearance">
              <Segmented value={s.theme} onChange={v => set("theme", v)} options={[{value:"light",label:"Light",icon:"sun"},{value:"dark",label:"Dark",icon:"moon"}]}/>
            </Field>
            <Field label="Accent">
              <Swatches value={s.accent} onChange={v => set("accent", v)} options={["#37aeb7","#4f46e5","#2563eb","#7c3aed","#e0533d","#18181b"]}/>
            </Field>
            <Field label="Font">
              <Segmented value={s.font} onChange={v => set("font", v)} options={FONT_OPTS}/>
            </Field>
            <Field label="Star color">
              <Segmented value={s.starColor} onChange={v => set("starColor", v)}
                options={[{value:"gold",label:"Gold"},{value:"accent",label:"Accent"},{value:"dark",label:"Ink"}]}/>
            </Field>
            <Field label="Corner radius" hint={`${s.radius}px`}>
              <Slider value={s.radius} min={0} max={22} onChange={v => set("radius", v)}/>
            </Field>
            <Field label="Card style">
              <Segmented value={s.cardStyle} onChange={v => set("cardStyle", v)}
                options={[{value:"border",label:"Bordered"},{value:"shadow",label:"Shadow"},{value:"soft",label:"Soft"}]}/>
            </Field>
            <Field label="Density">
              <Segmented value={s.density} onChange={v => set("density", v)}
                options={[{value:"cozy",label:"Cozy"},{value:"compact",label:"Compact"}]}/>
            </Field>
          </>
        )}

        {tab === "layout" && (
          <>
            <Field label="Columns">
              <Segmented value={s.columns} onChange={v => set("columns", v)}
                options={[{value:"auto",label:"Auto"},{value:"2",label:"2"},{value:"3",label:"3"}]}/>
            </Field>
            <Field label="Wall layout">
              <Segmented value={s.wallStyle} onChange={v => set("wallStyle", v)}
                options={[{value:"varied",label:"Varied"},{value:"uniform",label:"Uniform"}]}/>
            </Field>
            <Field label="Card heights">
              <Segmented value={s.cardHeights} onChange={v => set("cardHeights", v)}
                options={[{value:"equal",label:"Equal"},{value:"natural",label:"Natural"}]}/>
            </Field>
          </>
        )}

        {tab === "display" && (
          <Field label="Display">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Toggle checked={s.showHeader} onChange={v => set("showHeader", v)} label="Summary header"/>
              <Toggle checked={s.showAvgRating} onChange={v => set("showAvgRating", v)} label="Average rating"/>
              <Toggle checked={s.showReviewCount} onChange={v => set("showReviewCount", v)} label="Review count"/>
              <Toggle checked={s.showAvatars} onChange={v => set("showAvatars", v)} label="Reviewer avatars"/>
              <Toggle checked={s.showStarRatings} onChange={v => set("showStarRatings", v)} label="Star ratings"/>
              <Toggle checked={s.showDates} onChange={v => set("showDates", v)} label="Review dates"/>
              <Toggle checked={s.showSources} onChange={v => set("showSources", v)} label="Source logos"/>
              <Toggle checked={s.showOwnerResponses} onChange={v => set("showOwnerResponses", v)} label="Owner responses"/>
              <Toggle checked={s.showWriteReviewLink} onChange={v => set("showWriteReviewLink", v)} label="Write a review link"/>
              <Toggle checked={s.aiSummary} onChange={v => set("aiSummary", v)} label="AI summary"/>
              <Toggle checked={s.showNavArrows} onChange={v => set("showNavArrows", v)} label="Navigation arrows"/>
              <Toggle checked={s.showPagination} onChange={v => set("showPagination", v)} label="Pagination / load more"/>
              <Toggle checked={s.showBranding} onChange={v => set("showBranding", v)} label="WeHearYou branding"/>
            </div>
          </Field>
        )}

        {tab === "type" && (
          <>
            <Field label="Review text" hint={`${s.typeSize.reviewText}px`}>
              <Slider value={s.typeSize.reviewText} min={11} max={18} onChange={v => setType("reviewText", v)}/>
            </Field>
            <Field label="Reviewer names" hint={`${s.typeSize.reviewerNames}px`}>
              <Slider value={s.typeSize.reviewerNames} min={10} max={16} onChange={v => setType("reviewerNames", v)}/>
            </Field>
            <Field label="Header title" hint={`${s.typeSize.headerTitle}px`}>
              <Slider value={s.typeSize.headerTitle} min={14} max={28} onChange={v => setType("headerTitle", v)}/>
            </Field>
            <Field label="AI summary text" hint={`${s.typeSize.aiSummaryText}px`}>
              <Slider value={s.typeSize.aiSummaryText} min={11} max={18} onChange={v => setType("aiSummaryText", v)}/>
            </Field>
            <Field label="Review text limit" hint={`${s.reviewTextLimit} chars`}>
              <Slider value={s.reviewTextLimit} min={80} max={1000} step={10} onChange={v => set("reviewTextLimit", v)}/>
            </Field>
          </>
        )}

        {tab === "spotlight" && (
          <>
            <Field label="Spotlight card" hint="Accent background + serif font">
              <ReviewPicker mode="single" value={s.spotlightId} accent={s.accent}
                onToggle={id => set("spotlightId", s.spotlightId === id ? null : id)}/>
            </Field>
            <div className="hr"/>
            <Field label="Pinned reviews" hint="Scattered near the top">
              <ReviewPicker mode="multi" value={s.pinnedIds} accent={s.accent} onToggle={togglePin}/>
            </Field>
            <div className="hr"/>
            <Field label="Quote highlights" hint="Highlighted text snippets">
              <HighlightEditor highlights={s.highlights || []} onChange={v => set("highlights", v)} accent={s.accent}/>
            </Field>
          </>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { WallCustomizePanel });
