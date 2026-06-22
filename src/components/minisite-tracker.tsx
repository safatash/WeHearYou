"use client";
import { useEffect } from "react";

const CLICK_MAP: Record<string, string> = {
  call: "MINISITE_CLICK_CALL",
  website: "MINISITE_CLICK_WEBSITE",
  directions: "MINISITE_CLICK_DIRECTIONS",
  review: "MINISITE_CLICK_REVIEW",
  cta: "MINISITE_CLICK_CTA",
};

export function MiniSiteTracker({ slug, enabled }: { slug: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const url = `/api/public/minisite/${slug}/track`;
    let sessionId = sessionStorage.getItem("whs_session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("whs_session", sessionId);
    }
    const send = (eventType: string) => {
      const payload = JSON.stringify({ eventType, sessionId });
      navigator.sendBeacon?.(url, new Blob([payload], { type: "application/json" })) ||
        fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    };
    send("MINISITE_VIEWED");
    const onClick = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest("[data-track]");
      const key = el?.getAttribute("data-track");
      if (key && CLICK_MAP[key]) send(CLICK_MAP[key]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [slug, enabled]);
  return null;
}
