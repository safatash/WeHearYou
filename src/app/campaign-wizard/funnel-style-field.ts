import { normalizeFunnelStyle, type FunnelStyle } from "@/lib/funnel-style";
export function readFunnelStyleField(formData: FormData): FunnelStyle {
  return normalizeFunnelStyle(formData.get("funnelStyle"));
}
