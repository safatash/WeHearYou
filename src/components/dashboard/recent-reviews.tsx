"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Avatar, Stars, SourceTag } from "@/components/dashboard/charts";

export type RecentReview = {
  id: string;
  name: string;
  source: string;
  rating: number;
  time: string;
  status: "pending" | "responded";
  loc: string;
  text: string;
};

function ReviewItem({ r }: { r: RecentReview }) {
  const [open, setOpen] = useState(false);
  const responded = r.status === "responded";
  const negative = r.rating > 0 && r.rating <= 2;
  const pending = !responded;

  return (
    <div style={{ padding: "var(--row-pad) 4px", borderTop: "1px solid var(--ink-150)", position: "relative" }}>
      {pending && (
        <span
          style={{
            position: "absolute",
            left: -4,
            top: "var(--row-pad)",
            bottom: open ? undefined : "var(--row-pad)",
            width: 3,
            borderRadius: 3,
            background: negative ? "var(--danger)" : "var(--warning)",
          }}
        />
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <Avatar name={r.name} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
            <Stars value={r.rating} size={13} />
            <SourceTag source={r.source} showLabel={false} />
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-400)",
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon name="pin" size={12} />
              {r.loc ? `${r.loc} · ` : ""}
              {r.time}
            </span>
          </div>
          {r.text ? (
            <p style={{ fontSize: 13.3, color: "var(--ink-600)", marginTop: 6, lineHeight: 1.55 }}>{r.text}</p>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            {responded ? (
              <span className="badge badge-success">
                <Icon name="check" size={12} />
                Replied
              </span>
            ) : (
              <>
                <button className="btn btn-soft btn-sm" onClick={() => setOpen((o) => !o)}>
                  <Icon name="reply" size={14} />
                  Reply
                </button>
                <span className={`badge ${negative ? "badge-danger" : "badge-warning"}`}>
                  {negative ? "Needs attention" : "Awaiting reply"}
                </span>
              </>
            )}
            <Link href="/reviews" className="btn btn-ghost btn-sm btn-icon" title="Open" style={{ marginLeft: "auto" }}>
              <Icon name="tag" size={15} />
            </Link>
            <Link href="/reviews" className="btn btn-ghost btn-sm btn-icon" title="Archive">
              <Icon name="archive" size={15} />
            </Link>
          </div>

          {open && (
            <div
              className="anim-up"
              style={{
                marginTop: 12,
                border: "1px solid var(--ink-200)",
                borderRadius: "var(--r-md)",
                overflow: "hidden",
                background: "var(--ink-50)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--ink-200)",
                  background: "var(--white)",
                }}
              >
                <Icon name="sparkles" size={14} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-500)" }}>
                  Reply to this {r.rating}★ review in the Reviews Inbox
                </span>
                <Link href="/reviews" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>
                  <Icon name="send" size={13} />
                  Open inbox
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecentReviews({ reviews }: { reviews: RecentReview[] }) {
  const [tab, setTab] = useState<"all" | "pending" | "responded">("all");

  const filtered = reviews.filter((r) => {
    if (tab === "all") return true;
    if (tab === "pending") return r.status === "pending";
    return r.status === "responded";
  });
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginTop: 12, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)", width: "fit-content" }}>
        {([["all", "All"], ["pending", "Pending"], ["responded", "Responded"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              border: 0,
              cursor: "pointer",
              padding: "5px 12px",
              borderRadius: 5,
              fontSize: 12.5,
              fontWeight: 560,
              background: tab === k ? "var(--white)" : "transparent",
              color: tab === k ? "var(--ink-900)" : "var(--ink-500)",
              boxShadow: tab === k ? "var(--shadow-xs)" : "none",
              transition: "all .14s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {label}
            {k === "pending" && pendingCount > 0 && (
              <span
                className="tnum"
                style={{ background: "var(--warning-soft)", color: "var(--warning)", borderRadius: 999, padding: "0 6px", fontSize: 11, fontWeight: 700 }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}>
            <Icon name="check" size={22} />
            <div style={{ marginTop: 6 }}>All caught up — no reviews here.</div>
          </div>
        ) : (
          filtered.map((r) => <ReviewItem key={r.id} r={r} />)
        )}
      </div>
    </>
  );
}
