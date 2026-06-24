"use client";
import { useState, useEffect } from "react";
import { Icon } from "@/components/icon";
import {
  ScreenCard,
  BigBtn,
  FChip,
  ChipWrap,
  StepLabel,
  StarPicker,
  ActionPill,
  AiThinking,
  Avatar,
  Stars,
  BizHeader,
  RATING_LABELS,
  Confetti,
  SuccessCheck,
} from "../kit";
import { nextFromRating, type FunnelState, type ScreenId } from "../state";
import type { AiFunnelProps } from "../build-props";
import {
  generateReview,
  mapToneAction,
  type AssistantTone,
  type AssistantLength,
} from "../ai-client";
import { buildReview } from "../fallback-text";

/* ── Shared context type ─────────────────────────────────────────────────── */

interface ScreenCtx {
  props: AiFunnelProps;
  state: FunnelState;
  set: (patch: Partial<FunnelState>) => void;
  go: (screen: ScreenId) => void;
}

/* ── RatingScreen ────────────────────────────────────────────────────────── */

export const RatingScreen = ({ props, state, set, go }: ScreenCtx) => (
  <ScreenCard>
    <BizHeader biz={props.business} size="lg" />
    <div style={{ textAlign: "center", marginTop: 26 }}>
      <h1 className="fk-h1" style={{ textAlign: "center", fontSize: 26 }}>
        How was your experience?
      </h1>
      <p
        className="fk-sub"
        style={{ textAlign: "center", margin: "9px auto 0", maxWidth: 320 }}
      >
        We&apos;d love to hear your feedback. It only takes a minute.
      </p>
    </div>
    <div style={{ margin: "30px 0 8px" }}>
      <StarPicker value={state.rating} onChange={(r) => set({ rating: r })} />
    </div>
    <div className="fk-actions">
      <BigBtn
        onClick={() => go(nextFromRating(state.rating, props.threshold))}
        disabled={!state.rating}
        icon="arrowRight"
      >
        Continue
      </BigBtn>
      {!state.rating && (
        <p className="fk-hint">Tap a star to rate your experience</p>
      )}
    </div>
    <div className="fk-powered">
      <Icon name="bolt" size={12} />
      Powered by WeHearYou
    </div>
  </ScreenCard>
);

/* ── PosIntro ────────────────────────────────────────────────────────────── */

export const PosIntro = ({ props, state, set, go }: ScreenCtx) => (
  <ScreenCard>
    <StepLabel step={0} total={4} label="Need help writing your review?" />
    <h1 className="fk-h1">Let&apos;s turn your visit into a review</h1>
    <p className="fk-sub">
      Pick a few things that stood out and we&apos;ll help you write a review
      for {props.business.name} — you can edit every word before posting.
    </p>
    <div className="fk-field-label" style={{ marginTop: 22 }}>
      What stood out?
    </div>
    <ChipWrap>
      {props.stoodOut.map((c) => (
        <FChip
          key={c}
          label={c}
          active={state.chips.includes(c)}
          onClick={() =>
            set({
              chips: state.chips.includes(c)
                ? state.chips.filter((x) => x !== c)
                : [...state.chips, c],
            })
          }
        />
      ))}
    </ChipWrap>
    <div className="fk-actions">
      <BigBtn
        onClick={() => go("pos-details")}
        disabled={state.chips.length === 0}
        icon="arrowRight"
      >
        Continue
      </BigBtn>
      {state.chips.length === 0 && (
        <p className="fk-hint">Select at least one to continue</p>
      )}
    </div>
  </ScreenCard>
);

/* ── PosDetails ──────────────────────────────────────────────────────────── */

export const PosDetails = ({ props, state, set, go }: ScreenCtx) => {
  const [svcOpen, setSvcOpen] = useState(false);
  return (
    <ScreenCard>
      <StepLabel step={1} total={4} label="A little more detail" />
      <h1 className="fk-h1">Add a little more detail</h1>
      <p className="fk-sub">
        Optional, but it makes your review more helpful and specific. Skip
        anything you&apos;d rather not answer.
      </p>
      <div className="fk-stack">
        {props.services.length > 0 && (
          <div>
            <div className="fk-field-label">Service received</div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setSvcOpen((o) => !o)}
                className="fk-select"
              >
                <span
                  style={{
                    color: state.service
                      ? "var(--ink-900)"
                      : "var(--ink-400)",
                  }}
                >
                  {state.service || "Choose a service (optional)"}
                </span>
                <Icon
                  name="chevDown"
                  size={17}
                  style={{
                    color: "var(--ink-400)",
                    transform: svcOpen ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                  }}
                />
              </button>
              {svcOpen && (
                <div className="fk-menu">
                  {props.services.map((sv) => (
                    <button
                      key={sv}
                      onClick={() => {
                        set({ service: sv });
                        setSvcOpen(false);
                      }}
                      className="fk-menu-item"
                      data-active={state.service === sv}
                    >
                      {sv}
                      {state.service === sv && (
                        <Icon
                          name="check"
                          size={15}
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          <div className="fk-field-label">
            Who helped you?{" "}
            <span className="fk-opt">Optional</span>
          </div>
          <input
            className="fk-input"
            placeholder="e.g. Jordan, the design team…"
            value={state.helper}
            onChange={(e) => set({ helper: e.target.value })}
          />
        </div>
        <div>
          <div className="fk-field-label">
            Anything else you&apos;d like to mention?{" "}
            <span className="fk-opt">Optional</span>
          </div>
          <textarea
            className="fk-textarea"
            rows={3}
            placeholder="A detail or moment that made it great…"
            value={state.extra}
            onChange={(e) => set({ extra: e.target.value })}
          />
        </div>
      </div>
      <div className="fk-actions fk-actions-row">
        <BigBtn
          variant="secondary"
          full={false}
          onClick={() => go("pos-intro")}
          style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
        >
          <Icon
            name="arrowRight"
            size={18}
            style={{ transform: "rotate(180deg)" }}
          />
        </BigBtn>
        <BigBtn onClick={() => go("pos-review")} icon="sparkles">
          Write my review
        </BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ── PosReview ───────────────────────────────────────────────────────────── */

const TONE_ACTIONS: {
  key: string;
  label: string;
  icon: "refresh" | "arrowUp" | "arrowDown" | "chat" | "award";
}[] = [
  { key: "regen", label: "Regenerate", icon: "refresh" },
  { key: "shorter", label: "Make Shorter", icon: "arrowUp" },
  { key: "longer", label: "Make Longer", icon: "arrowDown" },
  { key: "casual", label: "More Casual", icon: "chat" },
  { key: "professional", label: "More Professional", icon: "award" },
];

export const PosReview = ({ props, state, set, go }: ScreenCtx) => {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"short" | "detailed">("detailed");
  const [tone, setTone] = useState<AssistantTone>("friendly");
  const [length, setLength] = useState<AssistantLength>("detailed");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const buildFallback = () => {
        const long = buildReview(
          {
            chips: state.chips,
            service: state.service,
            helper: state.helper,
            extra: state.extra,
          },
          props.business,
          "detailed"
        );
        const short = buildReview(
          {
            chips: state.chips,
            service: state.service,
            helper: state.helper,
            extra: state.extra,
          },
          props.business,
          "short"
        );
        return { long, short };
      };

      if (props.ai.reviewEnabled) {
        const result = await generateReview({
          locationId: props.locationId,
          rating: state.rating,
          selectedPhrases: state.chips,
          service: props.ai.includeService ? state.service : "",
          staffMember: state.helper,
          notes: props.ai.allowNotes ? state.extra : "",
          tone,
          length,
          sessionId: state.sessionId,
          isRegenerate: false,
        });
        if (cancelled) return;
        if (result.usedFallback) {
          const fb = buildFallback();
          set({ reviewLong: fb.long, reviewShort: fb.short });
        } else {
          const shortFb = buildReview(
            {
              chips: state.chips,
              service: state.service,
              helper: state.helper,
              extra: state.extra,
            },
            props.business,
            "short"
          );
          set({
            reviewLong: result.review,
            reviewShort: shortFb,
            sessionId: result.sessionId,
          });
        }
      } else {
        const fb = buildFallback();
        set({ reviewLong: fb.long, reviewShort: fb.short });
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAction(key: string) {
    const mapped = mapToneAction(
      key as Parameters<typeof mapToneAction>[0],
      { tone, length }
    );
    const newTone = mapped.tone;
    const newLength = mapped.length;
    setTone(newTone);
    setLength(newLength);

    // shorter/longer → just switch tab, no new AI call
    if (key === "shorter") {
      setTab("short");
      return;
    }
    if (key === "longer") {
      setTab("detailed");
      return;
    }

    setBusy(key);
    if (props.ai.reviewEnabled) {
      const result = await generateReview({
        locationId: props.locationId,
        rating: state.rating,
        selectedPhrases: state.chips,
        service: props.ai.includeService ? state.service : "",
        staffMember: state.helper,
        notes: props.ai.allowNotes ? state.extra : "",
        tone: newTone,
        length: newLength,
        sessionId: state.sessionId,
        isRegenerate: mapped.isRegenerate,
      });
      if (result.usedFallback) {
        const fb = buildReview(
          {
            chips: state.chips,
            service: state.service,
            helper: state.helper,
            extra: state.extra,
          },
          props.business,
          "detailed"
        );
        set({ reviewLong: fb, sessionId: result.sessionId });
      } else {
        set({ reviewLong: result.review, sessionId: result.sessionId });
      }
    } else {
      const fb = buildReview(
        {
          chips: state.chips,
          service: state.service,
          helper: state.helper,
          extra: state.extra,
        },
        props.business,
        "detailed"
      );
      set({ reviewLong: fb });
    }
    setBusy(null);
  }

  const missingService =
    props.services.length > 0 && !state.service && props.ai.includeService;

  const isPillVisible = (key: string): boolean => {
    if (key === "regen") return props.ai.allowRegenerate;
    if (key === "casual" || key === "professional") return props.ai.allowTone;
    if (key === "shorter" || key === "longer") return props.ai.allowLength;
    return true;
  };

  const currentText =
    tab === "detailed" ? state.reviewLong : state.reviewShort;

  return (
    <ScreenCard>
      <StepLabel step={2} total={4} label="Your AI-assisted review" />
      {loading ? (
        <AiThinking />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Avatar name="You" size={34} />
            <div>
              <Stars value={state.rating} size={14} />
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-400)",
                  marginTop: 1,
                }}
              >
                {RATING_LABELS[state.rating]}
              </div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--accent-strong)",
                background: "var(--accent-soft)",
                borderRadius: 999,
                padding: "3px 10px",
              }}
            >
              <Icon name="sparkles" size={12} />
              AI draft
            </span>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {(["detailed", "short"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="tap"
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 560,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  border:
                    tab === t
                      ? "1.5px solid var(--accent)"
                      : "1px solid var(--ink-200)",
                  background:
                    tab === t ? "var(--accent-soft)" : "var(--white)",
                  color:
                    tab === t ? "var(--accent-strong)" : "var(--ink-600)",
                }}
              >
                {t === "detailed" ? "Detailed" : "Short"}
              </button>
            ))}
          </div>

          <textarea
            className="fk-textarea"
            rows={6}
            value={currentText}
            onChange={(e) => {
              if (tab === "detailed") {
                set({ reviewLong: e.target.value });
              } else {
                set({ reviewShort: e.target.value });
              }
            }}
            style={{ marginBottom: 10 }}
          />

          {missingService && (
            <p className="fk-notice" style={{ marginBottom: 10 }}>
              <Icon name="info" size={14} />
              Add the service you received in the previous step to personalise
              your review further.
            </p>
          )}

          {/* Action pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              marginBottom: 14,
            }}
          >
            {TONE_ACTIONS.filter((a) => isPillVisible(a.key)).map((a) => (
              <ActionPill
                key={a.key}
                icon={a.icon}
                onClick={() => doAction(a.key)}
                active={busy === a.key}
              >
                {a.label}
              </ActionPill>
            ))}
          </div>

          <div className="fk-actions fk-actions-row">
            <BigBtn
              variant="secondary"
              full={false}
              onClick={() => go("pos-details")}
              style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
            >
              <Icon
                name="arrowRight"
                size={18}
                style={{ transform: "rotate(180deg)" }}
              />
            </BigBtn>
            <BigBtn onClick={() => { if (tab === "short") set({ reviewLong: state.reviewShort }); go("pos-confirm"); }} icon="arrowRight">
              Looks good
            </BigBtn>
          </div>
        </>
      )}
    </ScreenCard>
  );
};

/* ── PosConfirm ──────────────────────────────────────────────────────────── */

export const PosConfirm = ({ props: _props, state, set: _set, go }: ScreenCtx) => (
  <ScreenCard>
    <StepLabel step={3} total={4} label="Review your review" />
    <h1 className="fk-h1">Does this look good?</h1>
    <p className="fk-sub">
      Read it over and make any last edits. This is exactly what will be posted.
    </p>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "16px 0 10px",
      }}
    >
      <Avatar name="You" size={34} />
      <div>
        <Stars value={state.rating} size={14} />
        <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 1 }}>
          {RATING_LABELS[state.rating]}
        </div>
      </div>
    </div>
    <div
      className="fk-review-card"
      style={{
        background: "var(--ink-50)",
        borderRadius: 12,
        padding: "14px 16px",
        fontSize: 14.5,
        lineHeight: 1.65,
        color: "var(--ink-800)",
        marginBottom: 18,
        whiteSpace: "pre-wrap",
      }}
    >
      {state.reviewLong}
    </div>
    <div className="fk-actions fk-actions-row">
      <BigBtn
        variant="secondary"
        full={false}
        onClick={() => go("pos-review")}
        style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}
      >
        <Icon
          name="arrowRight"
          size={18}
          style={{ transform: "rotate(180deg)" }}
        />
      </BigBtn>
      <BigBtn onClick={() => go("pos-celebrate")} icon="arrowRight">
        Post my review
      </BigBtn>
    </div>
  </ScreenCard>
);

/* ── PosCelebrate ────────────────────────────────────────────────────────── */

export const PosCelebrate = ({ props, state, go }: ScreenCtx) => {
  const [copied, setCopied] = useState(false);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFired(true);
    if (state.reviewLong) {
      const safeCopy = async () => {
        try {
          await navigator.clipboard.writeText(state.reviewLong);
          setCopied(true);
        } catch {
          // clipboard access not available
        }
      };
      safeCopy();
    }
  }, [state.reviewLong]);

  async function recopy() {
    try {
      await navigator.clipboard.writeText(state.reviewLong);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  const preferred = props.destinations.find((d) => d.preferred);
  const others = props.destinations.filter((d) => !d.preferred);

  function destHref(d: (typeof props.destinations)[number]): string {
    if (d.isInternal) {
      return `${props.internalReviewBase}/review?rating=${state.rating}${props.embed ? "&embed=1" : ""}`;
    }
    return d.url ?? "#";
  }

  function destTarget(d: (typeof props.destinations)[number]): string | undefined {
    return d.isInternal ? undefined : "_blank";
  }

  function destRel(d: (typeof props.destinations)[number]): string | undefined {
    return d.isInternal ? undefined : "noopener noreferrer";
  }

  return (
    <ScreenCard>
      <div style={{ position: "relative" }}>
        <Confetti fire={fired} />
      </div>
      <SuccessCheck tone="accent" size={76} />
      <div style={{ textAlign: "center", marginTop: 16, marginBottom: 20 }}>
        <h1 className="fk-h1" style={{ marginBottom: 6 }}>
          Your review is ready!
        </h1>
        <p className="fk-sub">
          {copied
            ? "We've copied it to your clipboard. Just paste it when you get there."
            : "Tap below to post it — paste your review when prompted."}
        </p>
      </div>

      {preferred && (
        <div className="fk-dest-primary" style={{ marginBottom: 12 }}>
          <a
            href={destHref(preferred)}
            target={destTarget(preferred)}
            rel={destRel(preferred)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 18px",
              borderRadius: 14,
              background: "var(--white)",
              border: "1.5px solid var(--accent)",
              textDecoration: "none",
              color: "inherit",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: preferred.color,
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                flex: "none",
              }}
            >
              {preferred.glyph}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 640, fontSize: 15 }}>
                Post on {preferred.label}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-400)" }}>
                Tap to open, then paste your review
              </div>
            </div>
            <Icon name="external" size={17} style={{ color: "var(--ink-400)" }} />
          </a>
        </div>
      )}

      {others.length > 0 && (
        <div
          className="fk-dest-grid"
          style={{
            display: "grid",
            gridTemplateColumns: others.length > 1 ? "1fr 1fr" : "1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {others.map((d) => (
            <a
              key={d.id}
              href={destHref(d)}
              target={destTarget(d)}
              rel={destRel(d)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--white)",
                border: "1px solid var(--ink-200)",
                textDecoration: "none",
                color: "inherit",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: d.color,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  flex: "none",
                }}
              >
                {d.glyph}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 580 }}>
                {d.label}
              </span>
            </a>
          ))}
        </div>
      )}

      {state.reviewLong && (
        <button
          onClick={recopy}
          className="tap"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "11px 14px",
            borderRadius: 10,
            background: copied ? "var(--success-soft)" : "var(--ink-50)",
            border: "1px solid var(--ink-200)",
            fontSize: 13.5,
            fontWeight: 560,
            fontFamily: "inherit",
            color: copied ? "var(--success)" : "var(--ink-600)",
            cursor: "pointer",
            marginBottom: 16,
            transition: "background .2s, color .2s",
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={15} />
          {copied ? "Review copied to clipboard" : "Copy review to clipboard"}
        </button>
      )}

      <button
        onClick={() => go("rating")}
        className="tap"
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-400)",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: "6px 0",
        }}
      >
        Start over
      </button>
    </ScreenCard>
  );
};
