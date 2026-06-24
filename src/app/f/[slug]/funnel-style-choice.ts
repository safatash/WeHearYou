// src/app/f/[slug]/funnel-style-choice.ts
import { normalizeFunnelStyle } from "@/lib/funnel-style";
export function chooseFunnelRenderer(raw: unknown): "ai" | "simple" {
  return normalizeFunnelStyle(raw) === "AI_GUIDED" ? "ai" : "simple";
}
