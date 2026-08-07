/* WeHearYou — Review Funnel: app shell, rating screen, state machine.
   Branches on rating: 4–5★ → positive flow, 1–3★ → resolution flow.
   A preview toolbar lets you toggle mobile/desktop and jump between screens. */

const { useState: useStateRF, useEffect: useEffectRF } = React;

/* ===== SCREEN 1 — Rating selection (shared entry) ===== */
const RatingScreen = ({ s, set, go }) => (
  <ScreenCard>
    <BizHeader size="lg" />
    <div style={{ textAlign: "center", marginTop: 26 }}>
      <h1 className="fk-h1" style={{ textAlign: "center", fontSize: 26 }}>How was your experience?</h1>
      <p className="fk-sub" style={{ textAlign: "center", margin: "9px auto 0", maxWidth: 320 }}>We'd love to hear your feedback. It only takes a minute.</p>
    </div>

    <div style={{ margin: "30px 0 8px" }}>
      <StarPicker value={s.rating} onChange={(r) => set({ rating: r })} />
    </div>

    <div className="fk-actions">
      <BigBtn onClick={() => go(s.rating >= 4 ? "pos-intro" : "neg-intro")} disabled={!s.rating} icon="arrowRight">Continue</BigBtn>
      {!s.rating && <p className="fk-hint">Tap a star to rate your experience</p>}
    </div>
    <div className="fk-powered"><Icon name="bolt" size={12} />Powered by WeHearYou</div>
  </ScreenCard>
);

/* ---------- flow registry (for the navigator) ---------- */
const FLOW = {
  positive: [["pos-intro", "Intro & chips"], ["pos-details", "Details"], ["pos-review", "AI review"], ["pos-confirm", "Confirm"], ["pos-celebrate", "Copied 🎉"]],
  negative: [["neg-intro", "Intro"], ["neg-issues", "Issues"], ["neg-feedback", "Feedback"], ["neg-clarify", "AI clarify"], ["neg-confirm", "Confirm"], ["neg-submitted", "Submitted"]],
};

const INITIAL = {
  rating: 0,
  chips: [], service: "", helper: "", extra: "", reviewShort: "", reviewLong: "",
  issues: [], feedback: "", better: "", contact: "", contactValue: "", feedbackClarified: "", feedbackFinal: "",
};

function FunnelApp() {
  const [device, setDevice] = useStateRF("mobile");
  const [screen, setScreen] = useStateRF("rating");
  const [s, setS] = useStateRF(INITIAL);
  const [navOpen, setNavOpen] = useStateRF(false);
  const set = (patch) => setS(prev => ({ ...prev, ...patch }));
  const go = (sc) => { setScreen(sc); const el = document.querySelector(".fk-scroll"); if (el) el.scrollTop = 0; };
  const restart = () => { setS(INITIAL); go("rating"); };

  // ensure demo content exists when jumping directly to later positive screens
  const jump = (sc) => {
    setS(prev => {
      const next = { ...prev };
      if (sc.startsWith("pos")) {
        if (!next.rating || next.rating < 4) next.rating = 5;
        if (!next.chips.length) next.chips = ["Great Website Design", "Improved SEO & Rankings", "Highly Recommend", "Easy Process"];
        if (!next.service) next.service = "Local SEO";
        if (!next.reviewLong) { next.reviewShort = buildReview(next, "short"); next.reviewLong = buildReview(next, "detailed"); }
      }
      if (sc.startsWith("neg")) {
        if (!next.rating || next.rating >= 4) next.rating = 2;
        if (!next.issues.length) next.issues = ["Poor Communication", "Long Wait Time"];
        if (!next.feedback) next.feedback = "I had to follow up several times to get an update, and the project ran later than promised.";
        if (!next.feedbackFinal) next.feedbackFinal = clarifyFeedback(next.feedback, next.issues);
      }
      return next;
    });
    go(sc); setNavOpen(false);
  };

  const flowKey = screen.startsWith("neg") ? "negative" : screen.startsWith("pos") ? "positive" : null;

  let view;
  switch (screen) {
    case "rating": view = <RatingScreen s={s} set={set} go={go} />; break;
    case "pos-intro": view = <PosIntro s={s} set={set} next={() => go("pos-details")} />; break;
    case "pos-details": view = <PosDetails s={s} set={set} next={() => go("pos-review")} back={() => go("pos-intro")} />; break;
    case "pos-review": view = <PosReview s={s} set={set} next={() => go("pos-confirm")} back={() => go("pos-details")} />; break;
    case "pos-confirm": view = <PosConfirm s={s} next={() => go("pos-celebrate")} back={() => go("pos-review")} />; break;
    case "pos-celebrate": view = <PosCelebrate s={s} restart={restart} />; break;
    case "neg-intro": view = <NegIntro next={() => go("neg-issues")} />; break;
    case "neg-issues": view = <NegIssues s={s} set={set} next={() => go("neg-feedback")} back={() => go("neg-intro")} />; break;
    case "neg-feedback": view = <NegFeedback s={s} set={set} next={() => go("neg-clarify")} back={() => go("neg-issues")} />; break;
    case "neg-clarify": view = <NegClarify s={s} set={set} next={() => go("neg-confirm")} back={() => go("neg-feedback")} />; break;
    case "neg-confirm": view = <NegConfirm s={s} next={() => go("neg-submitted")} back={() => go("neg-clarify")} />; break;
    case "neg-submitted": view = <NegSubmitted s={s} restart={restart} />; break;
    default: view = <RatingScreen s={s} set={set} go={go} />;
  }

  return (
    <div className="fk-root">
      {/* preview toolbar (not part of the funnel) */}
      <div className="fk-toolbar">
        <div className="fk-toolbar-brand"><Icon name="bolt" size={15} style={{ color: "var(--accent-strong)" }} />WeHearYou · Review Funnel</div>
        <div className="fk-seg">
          <button data-active={device === "mobile"} onClick={() => setDevice("mobile")}><Icon name="phone" size={14} />Mobile</button>
          <button data-active={device === "desktop"} onClick={() => setDevice("desktop")}><Icon name="monitor" size={14} />Desktop</button>
        </div>
        <div style={{ position: "relative" }}>
          <button className="fk-nav-btn" onClick={() => setNavOpen(o => !o)}><Icon name="layers" size={15} />Screens<Icon name="chevDown" size={14} style={{ transform: navOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} /></button>
          {navOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNavOpen(false)} />
              <div className="fk-nav-menu">
                <button className="fk-nav-item" data-active={screen === "rating"} onClick={() => { jump("rating"); }}><span className="fk-nav-dot" />Rating selection</button>
                <div className="fk-nav-group">Positive · 4–5★</div>
                {FLOW.positive.map(([id, label]) => <button key={id} className="fk-nav-item" data-active={screen === id} onClick={() => jump(id)}><span className="fk-nav-dot pos" />{label}</button>)}
                <div className="fk-nav-group">Resolution · 1–3★</div>
                {FLOW.negative.map(([id, label]) => <button key={id} className="fk-nav-item" data-active={screen === id} onClick={() => jump(id)}><span className="fk-nav-dot neg" />{label}</button>)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* stage */}
      <div className="fk-stage" data-device={device}>
        {device === "mobile" ? (
          <div className="fk-phone">
            <div className="fk-phone-notch" />
            <div className="fk-scroll fk-scroll-mobile">
              <div className="fk-pad" key={screen}>{view}</div>
            </div>
          </div>
        ) : (
          <div className="fk-desktop">
            <div className="fk-desktop-rail">
              <BizHeader />
              <p className="fk-desktop-tag">Share your experience and help others find a team they can trust.</p>
              {flowKey && (
                <div className="fk-desktop-steps">
                  {FLOW[flowKey].map(([id, label], i) => {
                    const idx = FLOW[flowKey].findIndex(x => x[0] === screen);
                    const state = i < idx ? "done" : i === idx ? "cur" : "todo";
                    return (
                      <div key={id} className="fk-dstep" data-state={state}>
                        <span className="fk-dstep-dot">{state === "done" ? <Icon name="check" size={12} /> : i + 1}</span>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="fk-powered" style={{ marginTop: "auto" }}><Icon name="bolt" size={12} />Powered by WeHearYou</div>
            </div>
            <div className="fk-scroll fk-scroll-desktop">
              <div className="fk-pad" key={screen}>{view}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FunnelApp />);
