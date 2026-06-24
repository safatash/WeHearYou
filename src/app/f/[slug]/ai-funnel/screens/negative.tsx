"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import {
  ScreenCard,
  BigBtn,
  FChip,
  ChipWrap,
  StepLabel,
  ActionPill,
  Avatar,
  Stars,
  SuccessCheck,
} from "../kit";
import type { AiFunnelProps } from "../build-props";
import { type FunnelState, type ScreenId } from "../state";
import { clarifyFeedbackRemote } from "../ai-client";
import { clarifyFeedback } from "../fallback-text";

/* ── Shared context type ─────────────────────────────────────────────────── */

interface ScreenCtx {
  props: AiFunnelProps;
  state: FunnelState;
  set: (patch: Partial<FunnelState>) => void;
  go: (screen: ScreenId) => void;
}

/* ── NegIntro ────────────────────────────────────────────────────────────── */

const REASSURE_ITEMS: [IconName, string, string][] = [
  ["lock", "Private by default", "This goes to the business, not posted publicly."],
  ["clock", "Takes about a minute", "A few quick taps — type only if you want to."],
];

export const NegIntro = ({ props, state: _state, set: _set, go }: ScreenCtx) => (
  <ScreenCard>
    <div style={{ textAlign: "center", paddingTop: 6 }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        margin: "0 auto 18px",
        display: "grid",
        placeItems: "center",
        background: "var(--accent-soft)",
        color: "var(--accent-strong)",
      }}>
        <Icon name="heart" size={28} />
      </div>
      <h1 className="fk-h1" style={{ textAlign: "center" }}>We&apos;d like to understand what happened</h1>
      <p className="fk-sub" style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 380 }}>
        Thank you for being honest. Your feedback goes straight to {props.business.name} and helps them make things right and improve.
      </p>
    </div>
    <div className="fk-reassure">
      {REASSURE_ITEMS.map(([ic, t, d]) => (
        <div key={t} className="fk-reassure-row">
          <span className="fk-reassure-ic"><Icon name={ic} size={16} /></span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 1 }}>{d}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="fk-actions">
      <BigBtn onClick={() => go("neg-issues")} icon="arrowRight">Continue</BigBtn>
    </div>
  </ScreenCard>
);

/* ── NegIssues ───────────────────────────────────────────────────────────── */

export const NegIssues = ({ props, state, set, go }: ScreenCtx) => (
  <ScreenCard>
    <StepLabel step={0} total={3} label="What happened" />
    <h1 className="fk-h1">What best describes the issue?</h1>
    <p className="fk-sub">Choose anything that applies. This helps the team understand and respond faster.</p>
    <ChipWrap>
      {props.issues.map(c => (
        <FChip
          key={c}
          label={c}
          active={state.issues.includes(c)}
          onClick={() => set({ issues: state.issues.includes(c) ? state.issues.filter(x => x !== c) : [...state.issues, c] })}
        />
      ))}
    </ChipWrap>
    <div className="fk-actions fk-actions-row">
      <BigBtn
        variant="secondary"
        full={false}
        onClick={() => go("neg-intro")}
        style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
      >
        <Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} />
      </BigBtn>
      <BigBtn onClick={() => go("neg-feedback")} disabled={state.issues.length === 0} icon="arrowRight">Continue</BigBtn>
    </div>
  </ScreenCard>
);

/* ── NegFeedback ─────────────────────────────────────────────────────────── */

const CONTACT_OPTS: [FunnelState["contact"], string, IconName][] = [
  ["email", "Yes, by email", "mail"],
  ["phone", "Yes, by phone", "phone"],
  ["no", "No thanks", "close"],
];

export const NegFeedback = ({ props, state, set, go }: ScreenCtx) => {
  const [clarifying, setClarifying] = useState(false);

  const onClarify = async () => {
    setClarifying(true);
    const { rewritten, usedFallback } = await clarifyFeedbackRemote(props.locationId, state.feedback, state.issues);
    set({ feedbackClarified: usedFallback || !rewritten ? clarifyFeedback(state.feedback, state.issues, props.business) : rewritten });
    setClarifying(false);
    go("neg-clarify");
  };

  return (
    <ScreenCard>
      <StepLabel step={1} total={3} label="Tell us more" />
      <h1 className="fk-h1">Tell us what happened</h1>
      <p className="fk-sub">Share as much or as little as you&apos;d like. There are no wrong answers here.</p>
      <div className="fk-stack">
        <textarea
          className="fk-textarea"
          rows={5}
          placeholder="Share as much or as little as you'd like…"
          value={state.feedback}
          onChange={e => set({ feedback: e.target.value })}
          autoFocus
        />
        <div>
          <div className="fk-field-label">What would have made this better? <span className="fk-opt">Optional</span></div>
          <input
            className="fk-input"
            placeholder="e.g. a faster response, clearer pricing…"
            value={state.better}
            onChange={e => set({ better: e.target.value })}
          />
        </div>
        <div>
          <div className="fk-field-label">Would you like someone to contact you?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {CONTACT_OPTS.map(([k, l, ic]) => (
              <button
                key={k}
                onClick={() => set({ contact: k })}
                className="tap"
                data-active={state.contact === k}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  padding: "0 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 560,
                  fontFamily: "inherit",
                  transition: "all .14s",
                  border: state.contact === k ? "1.5px solid var(--accent)" : "1.5px solid var(--ink-200)",
                  background: state.contact === k ? "var(--accent-soft)" : "var(--white)",
                  color: state.contact === k ? "var(--accent-strong)" : "var(--ink-700)",
                }}
              >
                <Icon name={ic} size={15} />{l}
              </button>
            ))}
          </div>
        </div>
        {(state.contact === "email" || state.contact === "phone") && (
          <div className="anim-up">
            <div className="fk-field-label">{state.contact === "email" ? "Your email" : "Your phone number"}</div>
            <input
              className="fk-input"
              type={state.contact === "email" ? "email" : "tel"}
              placeholder={state.contact === "email" ? "you@example.com" : "(555) 000-0000"}
              value={state.contactValue}
              onChange={e => set({ contactValue: e.target.value })}
            />
          </div>
        )}
      </div>
      <div className="fk-actions fk-stack">
        <BigBtn
          onClick={onClarify}
          disabled={clarifying || !state.feedback.trim()}
          icon={clarifying ? "refresh" : "sparkles"}
        >
          {clarifying ? "Organizing…" : "Make my feedback clearer"}
        </BigBtn>
        <div className="fk-actions-row" style={{ width: "100%" }}>
          <BigBtn
            variant="secondary"
            full={false}
            onClick={() => go("neg-issues")}
            style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
          >
            <Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} />
          </BigBtn>
          <BigBtn
            variant="secondary"
            onClick={() => { set({ feedbackClarified: "" }); go("neg-clarify"); }}
            disabled={!state.feedback.trim()}
          >
            Continue without AI
          </BigBtn>
        </div>
      </div>
    </ScreenCard>
  );
};

/* ── NegClarify ──────────────────────────────────────────────────────────── */

export const NegClarify = ({ props, state, set, go }: ScreenCtx) => {
  const suggested = state.feedbackClarified || clarifyFeedback(state.feedback, state.issues, props.business);
  const [choice, setChoice] = useState<"suggested" | "original" | "edit">("suggested");
  const [editText, setEditText] = useState(suggested);

  const proceed = () => {
    const finalText = choice === "original" ? state.feedback : choice === "edit" ? editText : suggested;
    set({ feedbackFinal: finalText });
    go("neg-confirm");
  };

  return (
    <ScreenCard>
      <StepLabel step={2} total={3} label="A clearer version" />
      <h1 className="fk-h1">We organized your feedback</h1>
      <p className="fk-sub">Same meaning, just tidied up. You&apos;re always in control of what gets sent.</p>
      <div className="fk-compare">
        <button
          className="fk-compare-card"
          data-active={choice === "original"}
          onClick={() => setChoice("original")}
        >
          <div className="fk-compare-head">
            <Icon name="fileText" size={14} />Your words
            <span style={{ marginLeft: "auto" }}>
              {choice === "original" && <Icon name="check" size={15} style={{ color: "var(--accent)" }} />}
            </span>
          </div>
          <p className="fk-compare-text">{state.feedback || "—"}</p>
        </button>
        <button
          className="fk-compare-card"
          data-active={choice === "suggested"}
          onClick={() => setChoice("suggested")}
        >
          <div className="fk-compare-head">
            <Icon name="sparkles" size={14} style={{ color: "var(--accent-strong)" }} />Suggested
            <span className="badge badge-accent" style={{ marginLeft: "auto", height: 18 }}>Clearer</span>
          </div>
          <p className="fk-compare-text">{suggested}</p>
        </button>
      </div>
      {choice === "edit" && (
        <div className="anim-up" style={{ marginTop: 14 }}>
          <textarea
            className="fk-textarea"
            rows={5}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
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
        <BigBtn
          variant="secondary"
          full={false}
          onClick={() => go("neg-feedback")}
          style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
        >
          <Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} />
        </BigBtn>
        <BigBtn onClick={proceed} icon="arrowRight">Continue</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ── NegConfirm ──────────────────────────────────────────────────────────── */

export const NegConfirm = ({ props, state, set: _set, go }: ScreenCtx) => {
  const final = state.feedbackFinal || state.feedback;
  return (
    <ScreenCard>
      <h1 className="fk-h1">Does this describe your experience?</h1>
      <p className="fk-sub">This goes privately to {props.business.name}. Edit it if anything&apos;s off.</p>
      <div className="fk-review-card fk-review-static" style={{ marginTop: 16 }}>
        <div className="fk-review-head">
          <Avatar name="You" size={30} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 620 }}>Your feedback</span>
            <div><Stars value={state.rating} size={12} /></div>
          </div>
        </div>
        <p className="fk-review-final">{final}</p>
        {state.contact !== "no" && state.contact && (
          <div className="fk-contact-note">
            <Icon name={state.contact === "email" ? "mail" : "phone"} size={13} />
            You asked to be contacted by {state.contact}{state.contactValue ? ` · ${state.contactValue}` : ""}
          </div>
        )}
      </div>
      <div className="fk-actions fk-stack">
        <BigBtn onClick={() => go("neg-submitted")} icon="send">Submit feedback</BigBtn>
        <BigBtn variant="ghost" onClick={() => go("neg-clarify")}>Edit feedback</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ── NegSubmitted ────────────────────────────────────────────────────────── */

export const NegSubmitted = ({ props, state, set: _set, go }: ScreenCtx) => (
  <ScreenCard>
    <div style={{ textAlign: "center", paddingTop: 8 }}>
      <SuccessCheck tone="success" />
      <h1 className="fk-h1" style={{ textAlign: "center", marginTop: 18 }}>Thank you for sharing your feedback</h1>
      <p className="fk-sub" style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 380 }}>
        {props.business.name} can use this to improve. We&apos;re grateful you took the time to help them get better.
      </p>
      {state.contact && state.contact !== "no" && (
        <div className="fk-contact-card">
          <Icon name={state.contact === "email" ? "mail" : "phone"} size={16} style={{ color: "var(--accent-strong)" }} />
          <span>The business may reach out to you by {state.contact} regarding your feedback.</span>
        </div>
      )}
    </div>
    <button onClick={() => go("rating")} className="fk-restart" style={{ marginTop: 28 }}>Done</button>
  </ScreenCard>
);
