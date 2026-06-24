"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { BizHeader } from "./kit";
import { INITIAL_STATE, type FunnelState, type ScreenId, contactSummary } from "./state";
import type { AiFunnelProps } from "./build-props";
import { RatingScreen, PosIntro, PosDetails, PosReview, PosConfirm, PosCelebrate } from "./screens/positive";
import { NegIntro, NegIssues, NegFeedback, NegClarify, NegConfirm, NegSubmitted } from "./screens/negative";
import { recordPositiveReview, recordPrivateFeedback } from "../actions";

const FLOW: Record<"positive" | "negative", [ScreenId, string][]> = {
  positive: [["pos-intro","Intro & chips"],["pos-details","Details"],["pos-review","AI review"],["pos-confirm","Confirm"],["pos-celebrate","Done 🎉"]],
  negative: [["neg-intro","Intro"],["neg-issues","Issues"],["neg-feedback","Feedback"],["neg-clarify","AI clarify"],["neg-confirm","Confirm"],["neg-submitted","Submitted"]],
};

export function AiFunnelFlow(props: AiFunnelProps & {
  onRecordPositive?: (i: { slug: string; rating: number; body: string; embed: boolean }) => Promise<unknown>;
  onRecordNegative?: (i: { slug: string; rating: number; feedback: string; contact: string; embed: boolean }) => Promise<unknown>;
}) {
  const onRecordPositive = props.onRecordPositive ?? recordPositiveReview;
  const onRecordNegative = props.onRecordNegative ?? recordPrivateFeedback;

  const [screen, setScreen] = useState<ScreenId>("rating");
  const [state, setState] = useState<FunnelState>(INITIAL_STATE);
  const [, startTransition] = useTransition();
  const set = (patch: Partial<FunnelState>) => setState(prev => ({ ...prev, ...patch }));

  const go = (next: ScreenId) => {
    // fire persistence on the terminal-confirm transitions (best-effort; never block UI)
    if (next === "pos-celebrate") {
      startTransition(() => { void onRecordPositive({ slug: props.slug, rating: state.rating, body: state.reviewLong, embed: props.embed }); });
    } else if (next === "neg-submitted") {
      startTransition(() => { void onRecordNegative({ slug: props.slug, rating: state.rating, feedback: state.feedbackFinal || state.feedback, contact: contactSummary(state), embed: props.embed }); });
    }
    setScreen(next);
    const el = document.querySelector(".fk-scroll-desktop");
    if (el) el.scrollTop = 0;
  };

  const ctx = { props, state, set, go };
  let view: React.ReactNode;
  switch (screen) {
    case "rating": view = <RatingScreen {...ctx} />; break;
    case "pos-intro": view = <PosIntro {...ctx} />; break;
    case "pos-details": view = <PosDetails {...ctx} />; break;
    case "pos-review": view = <PosReview {...ctx} />; break;
    case "pos-confirm": view = <PosConfirm {...ctx} />; break;
    case "pos-celebrate": view = <PosCelebrate {...ctx} />; break;
    case "neg-intro": view = <NegIntro {...ctx} />; break;
    case "neg-issues": view = <NegIssues {...ctx} />; break;
    case "neg-feedback": view = <NegFeedback {...ctx} />; break;
    case "neg-clarify": view = <NegClarify {...ctx} />; break;
    case "neg-confirm": view = <NegConfirm {...ctx} />; break;
    case "neg-submitted": view = <NegSubmitted {...ctx} />; break;
    default: view = <RatingScreen {...ctx} />;
  }

  const flowKey: "positive" | "negative" | null =
    screen.startsWith("neg") ? "negative" : screen.startsWith("pos") ? "positive" : null;

  return (
    <div className="fk-root">
      <div className="fk-stage" data-device="desktop">
        <div className="fk-desktop">
          <div className="fk-desktop-rail">
            <BizHeader biz={props.business} />
            <p className="fk-desktop-tag">Share your experience and help others find a team they can trust.</p>
            {flowKey && (
              <div className="fk-desktop-steps">
                {FLOW[flowKey].map(([id, label], i) => {
                  const idx = FLOW[flowKey].findIndex(x => x[0] === screen);
                  const stState = i < idx ? "done" : i === idx ? "cur" : "todo";
                  return (
                    <div key={id} className="fk-dstep" data-state={stState}>
                      <span className="fk-dstep-dot">{stState === "done" ? <Icon name="check" size={12} /> : i + 1}</span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="fk-powered" style={{ marginTop: "auto" }}><Icon name="bolt" size={12} />Powered by WeHearYou</div>
          </div>
          <div className="fk-scroll-desktop">
            <div className="fk-pad" key={screen}>{view}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
