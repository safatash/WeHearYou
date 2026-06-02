"use client";

import { useEffect } from "react";

export function ReviewLinkBeacon({
  slug,
  src,
  medium,
  placement,
}: {
  slug: string;
  src: string | null;
  medium: string | null;
  placement: string | null;
}) {
  useEffect(() => {
    const SESSION_KEY = `rl_viewed_${slug}`;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let sessionId = sessionStorage.getItem("rl_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("rl_session_id", sessionId);
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    fetch(`/api/review-links/${slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "LINK_VIEWED", sessionId, src, medium, placement }),
    }).catch(() => {});
  }, [slug, src, medium, placement]);

  return null;
}
