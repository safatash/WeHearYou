/* WeHearYou — Review Funnel: NEGATIVE flow (1–3 stars).
   intro → issue selection → feedback → AI clarify → confirm → submitted.
   Tone is supportive, never defensive, never review-suppression. */

const { useState: useStateNF, useEffect: useEffectNF } = React;

/* ===== SCREEN 7 — Resolution assistant intro ===== */
const NegIntro = ({ next }) => (
  <ScreenCard>
    <div style={{ textAlign: "center", paddingTop: 6 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px", display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
        <Icon name="heart" size={28} />
      </div>
      <h1 className="fk-h1" style={{ textAlign: "center" }}>We'd like to understand what happened</h1>
      <p className="fk-sub" style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 380 }}>
        Thank you for being honest. Your feedback goes straight to {BIZ.name} and helps them make things right and improve.
      </p>
    </div>

    <div className="fk-reassure">
      {[["lock", "Private by default", "This goes to the business, not posted publicly."],
        ["clock", "Takes about a minute", "A few quick taps — type only if you want to."]].map(([ic, t, d]) => (
        <div key={t} className="fk-reassure-row">
          <span className="fk-reassure-ic"><Icon name={ic} size={16} /></span>
          <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 1 }}>{d}</div></div>
        </div>
      ))}
    </div>

    <div className="fk-actions"><BigBtn onClick={next} icon="arrowRight">Continue</BigBtn></div>
  </ScreenCard>
);

/* ===== SCREEN 8 — Issue selection ===== */
const NegIssues = ({ s, set, next, back }) => (
  <ScreenCard>
    <StepLabel step={0} total={3} label="What happened" />
    <h1 className="fk-h1">What best describes the issue?</h1>
    <p className="fk-sub">Choose anything that applies. This helps the team understand and respond faster.</p>

    <ChipWrap>
      {ISSUES.map(c => (
        <FChip key={c} label={c} active={s.issues.includes(c)}
          onClick={() => set({ issues: s.issues.includes(c) ? s.issues.filter(x => x !== c) : [...s.issues, c] })} />
      ))}
    </ChipWrap>

    <div className="fk-actions fk-actions-row">
      <BigBtn variant="secondary" full={false} onClick={back} style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}><Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} /></BigBtn>
      <BigBtn onClick={next} disabled={s.issues.length === 0} icon="arrowRight">Continue</BigBtn>
    </div>
  </ScreenCard>
);

/* ===== SCREEN 9 — Feedback collection ===== */
const CONTACT_OPTS = [["email", "Yes, by email", "mail"], ["phone", "Yes, by phone", "phone"], ["no", "No thanks", "close"]];
const NegFeedback = ({ s, set, next, back }) => {
  const [clarifying, setClarifying] = useStateNF(false);
  const onClarify = () => { setClarifying(true); setTimeout(() => { set({ feedbackClarified: clarifyFeedback(s.feedback, s.issues) }); setClarifying(false); next(); }, 1100); };
  return (
    <ScreenCard>
      <StepLabel step={1} total={3} label="Tell us more" />
      <h1 className="fk-h1">Tell us what happened</h1>
      <p className="fk-sub">Share as much or as little as you'd like. There are no wrong answers here.</p>

      <div className="fk-stack">
        <textarea className="fk-textarea" rows={5} placeholder="Share as much or as little as you'd like…" value={s.feedback} onChange={e => set({ feedback: e.target.value })} autoFocus />

        <div>
          <div className="fk-field-label">What would have made this better? <span className="fk-opt">Optional</span></div>
          <input className="fk-input" placeholder="e.g. a faster response, clearer pricing…" value={s.better} onChange={e => set({ better: e.target.value })} />
        </div>

        <div>
          <div className="fk-field-label">Would you like someone to contact you?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {CONTACT_OPTS.map(([k, l, ic]) => (
              <button key={k} onClick={() => set({ contact: k })} className="tap" data-active={s.contact === k} style={{
                display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 12, cursor: "pointer",
                fontSize: 14, fontWeight: 560, fontFamily: "inherit", transition: "all .14s",
                border: s.contact === k ? "1.5px solid var(--accent)" : "1.5px solid var(--ink-200)",
                background: s.contact === k ? "var(--accent-soft)" : "var(--white)", color: s.contact === k ? "var(--accent-strong)" : "var(--ink-700)" }}>
                <Icon name={ic} size={15} />{l}
              </button>
            ))}
          </div>
        </div>

        {(s.contact === "email" || s.contact === "phone") && (
          <div className="anim-up">
            <div className="fk-field-label">{s.contact === "email" ? "Your email" : "Your phone number"}</div>
            <input className="fk-input" type={s.contact === "email" ? "email" : "tel"} placeholder={s.contact === "email" ? "you@example.com" : "(555) 000-0000"} value={s.contactValue} onChange={e => set({ contactValue: e.target.value })} />
          </div>
        )}
      </div>

      <div className="fk-actions fk-stack">
        <BigBtn onClick={onClarify} disabled={clarifying || !s.feedback.trim()} icon={clarifying ? "refresh" : "sparkle"}>{clarifying ? "Organizing…" : "Make my feedback clearer"}</BigBtn>
        <div className="fk-actions-row" style={{ width: "100%" }}>
          <BigBtn variant="secondary" full={false} onClick={back} style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}><Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} /></BigBtn>
          <BigBtn variant="secondary" onClick={() => { set({ feedbackClarified: "" }); next(); }} disabled={!s.feedback.trim()}>Continue without AI</BigBtn>
        </div>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 10 — AI feedback clarify ===== */
const NegClarify = ({ s, set, next, back }) => {
  const suggested = s.feedbackClarified || clarifyFeedback(s.feedback, s.issues);
  const [choice, setChoice] = useStateNF("suggested"); // suggested | original | edit
  const [editText, setEditText] = useStateNF(suggested);

  const proceed = () => {
    const finalText = choice === "original" ? s.feedback : choice === "edit" ? editText : suggested;
    set({ feedbackFinal: finalText }); next();
  };

  return (
    <ScreenCard>
      <StepLabel step={2} total={3} label="A clearer version" />
      <h1 className="fk-h1">We organized your feedback</h1>
      <p className="fk-sub">Same meaning, just tidied up. You're always in control of what gets sent.</p>

      <div className="fk-compare">
        <button className="fk-compare-card" data-active={choice === "original"} onClick={() => setChoice("original")}>
          <div className="fk-compare-head"><Icon name="fileText" size={14} />Your words<span style={{ marginLeft: "auto" }}>{choice === "original" && <Icon name="check" size={15} style={{ color: "var(--accent)" }} />}</span></div>
          <p className="fk-compare-text">{s.feedback || "—"}</p>
        </button>
        <button className="fk-compare-card" data-active={choice === "suggested"} onClick={() => setChoice("suggested")}>
          <div className="fk-compare-head"><Icon name="sparkle" size={14} style={{ color: "var(--accent-strong)" }} />Suggested<span className="badge badge-accent" style={{ marginLeft: "auto", height: 18 }}>Clearer</span></div>
          <p className="fk-compare-text">{suggested}</p>
        </button>
      </div>

      {choice === "edit" && (
        <div className="anim-up" style={{ marginTop: 14 }}>
          <textarea className="fk-textarea" rows={5} value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
        </div>
      )}

      <div className="fk-notice fk-notice-calm">
        <Icon name="shield" size={15} style={{ flex: "none", marginTop: 1 }} />
        <span>We only clarify wording — we never change the meaning of your feedback.</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <ActionPill icon="check" active={choice === "suggested"} onClick={() => setChoice("suggested")}>Use suggested</ActionPill>
        <ActionPill icon="fileText" active={choice === "original"} onClick={() => setChoice("original")}>Keep original</ActionPill>
        <ActionPill icon="edit" active={choice === "edit"} onClick={() => { setEditText(suggested); setChoice("edit"); }}>Edit manually</ActionPill>
      </div>

      <div className="fk-actions fk-actions-row">
        <BigBtn variant="secondary" full={false} onClick={back} style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}><Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} /></BigBtn>
        <BigBtn onClick={proceed} icon="arrowRight">Continue</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 11 — Submit confirmation ===== */
const NegConfirm = ({ s, next, back }) => {
  const final = s.feedbackFinal || s.feedback;
  return (
    <ScreenCard>
      <h1 className="fk-h1">Does this describe your experience?</h1>
      <p className="fk-sub">This goes privately to {BIZ.name}. Edit it if anything's off.</p>

      <div className="fk-review-card fk-review-static" style={{ marginTop: 16 }}>
        <div className="fk-review-head">
          <Avatar name="You" size={30} />
          <div><span style={{ fontSize: 13, fontWeight: 620 }}>Your feedback</span><div><Stars value={s.rating} size={12} /></div></div>
        </div>
        <p className="fk-review-final">{final}</p>
        {s.contact !== "no" && s.contact && (
          <div className="fk-contact-note"><Icon name={s.contact === "email" ? "mail" : "phone"} size={13} />You asked to be contacted by {s.contact}{s.contactValue ? ` · ${s.contactValue}` : ""}</div>
        )}
      </div>

      <div className="fk-actions fk-stack">
        <BigBtn onClick={next} icon="send">Submit feedback</BigBtn>
        <BigBtn variant="ghost" onClick={back}>Edit feedback</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 12 — Feedback submitted ===== */
const NegSubmitted = ({ s, restart }) => (
  <ScreenCard>
    <div style={{ textAlign: "center", paddingTop: 8 }}>
      <SuccessCheck tone="success" />
      <h1 className="fk-h1" style={{ textAlign: "center", marginTop: 18 }}>Thank you for sharing your feedback</h1>
      <p className="fk-sub" style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 380 }}>
        {BIZ.name} can use this to improve. We're grateful you took the time to help them get better.
      </p>

      {s.contact && s.contact !== "no" && (
        <div className="fk-contact-card">
          <Icon name={s.contact === "email" ? "mail" : "phone"} size={16} style={{ color: "var(--accent-strong)" }} />
          <span>The business may reach out to you by {s.contact} regarding your feedback.</span>
        </div>
      )}
    </div>
    <button onClick={restart} className="fk-restart" style={{ marginTop: 28 }}>Done</button>
  </ScreenCard>
);

Object.assign(window, { NegIntro, NegIssues, NegFeedback, NegClarify, NegConfirm, NegSubmitted });
