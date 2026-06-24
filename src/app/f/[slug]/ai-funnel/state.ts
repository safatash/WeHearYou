export type ScreenId =
  | "rating"
  | "pos-intro"
  | "pos-details"
  | "pos-review"
  | "pos-confirm"
  | "pos-celebrate"
  | "neg-intro"
  | "neg-issues"
  | "neg-feedback"
  | "neg-clarify"
  | "neg-confirm"
  | "neg-submitted";

export interface FunnelState {
  rating: number;
  chips: string[];
  service: string;
  helper: string;
  extra: string;
  reviewShort: string;
  reviewLong: string;
  sessionId: string | null;
  issues: string[];
  feedback: string;
  better: string;
  contact: "" | "email" | "phone" | "no";
  contactValue: string;
  feedbackClarified: string;
  feedbackFinal: string;
}

export const INITIAL_STATE: FunnelState = {
  rating: 0,
  chips: [],
  service: "",
  helper: "",
  extra: "",
  reviewShort: "",
  reviewLong: "",
  sessionId: null,
  issues: [],
  feedback: "",
  better: "",
  contact: "",
  contactValue: "",
  feedbackClarified: "",
  feedbackFinal: "",
};

/** rating >= threshold → "pos-intro", else → "neg-intro" */
export function nextFromRating(rating: number, threshold: number): ScreenId {
  return rating >= threshold ? "pos-intro" : "neg-intro";
}

/** "" when contact is "" | "no"; else `${contact}:${contactValue}` */
export function contactSummary(state: FunnelState): string {
  if (state.contact === "" || state.contact === "no") return "";
  return `${state.contact}:${state.contactValue}`;
}
