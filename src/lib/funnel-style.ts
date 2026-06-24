export const FUNNEL_STYLES = ["SIMPLE", "AI_GUIDED"] as const;
export type FunnelStyle = (typeof FUNNEL_STYLES)[number];
export const DEFAULT_FUNNEL_STYLE: FunnelStyle = "SIMPLE";

export function isFunnelStyle(v: unknown): v is FunnelStyle {
  return typeof v === "string" && (FUNNEL_STYLES as readonly string[]).includes(v);
}
export function normalizeFunnelStyle(v: unknown): FunnelStyle {
  return isFunnelStyle(v) ? v : DEFAULT_FUNNEL_STYLE;
}
