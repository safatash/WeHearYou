export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { GbpPublishStatus, GbpPostType } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations, getLocationPortfolioStats } from "@/lib/locations";
import { buildLocationReputation } from "@/lib/location-reputation";

/* ---------- presentational helpers (server-rendered, no interactivity) ---------- */

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function StarRow({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= Math.round(value) ? "var(--star)" : "var(--ink-200)"}>
          <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" />
        </svg>
      ))}
    </span>
  );
}

function Sparkline({ points, tone }: { points: number[]; tone: "accent" | "warning" }) {
  const w = 70;
  const h = 30;
  if (points.length < 2) return <span style={{ width: w, flex: "none" }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i * w) / (points.length - 1);
    const y = h - 3 - ((p - min) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flex: "none" }} aria-hidden="true">
      <polyline points={coords.join(" ")} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: tone === "warning" ? "var(--warning)" : "var(--accent)" }} />
    </svg>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className="badge tnum"
      style={{ height: 16, fontSize: 9.5, paddingLeft: 5, background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}
    >
      <Icon name="arrowUp" size={8} style={{ transform: up ? "none" : "rotate(180deg)" }} />{up ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

const POST_TYPE_LABEL: Record<GbpPostType, string> = {
  WHATS_NEW: "What's new",
  OFFER: "Offer",
  EVENT: "Event",
};

function postStatusMeta(status: GbpPublishStatus): { label: string; cls: string; dot: string } {
  switch (status) {
    case "PUBLISHED": return { label: "Live", cls: "badge-success", dot: "var(--success)" };
    case "SCHEDULED": return { label: "Scheduled", cls: "badge-warning", dot: "var(--warning)" };
    case "FAILED": return { label: "Failed", cls: "badge-danger", dot: "var(--danger)" };
    case "EXPIRED": return { label: "Expired", cls: "badge-neutral", dot: "var(--ink-400)" };
    default: return { label: "Draft", cls: "badge-neutral", dot: "var(--ink-400)" };
  }
}

const shortDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d) : "—";

export default async function GbpManagerPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const orgId = membership.organizationId;
  const locationIds = await getCurrentAccessibleLocationIds();
  const scoped = locationIds.length > 0;
  const locationRelWhere = { organizationId: orgId, ...(scoped ? { id: { in: locationIds } } : {}) };

  const [locations, connection, draftReviews, recentPosts, scheduledPosts, livePhotos, unansweredQa] = await Promise.all([
    getLocations(locationIds),
    prisma.googleAccountConnection.findFirst({ where: { organizationId: orgId } }),
    prisma.review.findMany({
      where: { location: locationRelWhere, replyDraft: { not: null }, replyPublishedAt: null },
      select: { id: true, reviewerName: true, rating: true, replyDraft: true, location: { select: { name: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 3,
    }),
    prisma.gbpPost.findMany({
      where: { location: locationRelWhere },
      select: { id: true, postType: true, content: true, status: true, scheduledAt: true, publishedAt: true, location: { select: { name: true } } },
      orderBy: [{ publishedAt: "desc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.gbpPost.count({ where: { location: locationRelWhere, status: GbpPublishStatus.SCHEDULED } }),
    prisma.gbpPhoto.count({ where: { location: locationRelWhere, status: GbpPublishStatus.PUBLISHED } }),
    prisma.gbpQuestion.count({ where: { location: locationRelWhere, answeredAt: null } }),
  ]);

  const reps = locations.map((location) => ({ location, rep: buildLocationReputation(location) }));
  const portfolio = getLocationPortfolioStats(locations);
  const totalUnreplied = portfolio.totalPending;
  const totalDraftsPending = draftReviews.length;

  // Portfolio rating delta: review-weighted mean of per-location deltas.
  const withDelta = reps.filter((r) => r.rep.ratingDelta !== null && r.rep.reviewCount > 0);
  const weightSum = withDelta.reduce((a, r) => a + r.rep.reviewCount, 0);
  const ratingDelta = weightSum > 0
    ? Math.round((withDelta.reduce((a, r) => a + (r.rep.ratingDelta ?? 0) * r.rep.reviewCount, 0) / weightSum) * 10) / 10
    : null;

  const connected = Boolean(connection);
  const accountLabel = connection?.email ?? "Google Business Profile";
  const lastSync = connection?.lastSyncedAt ?? connection?.lastBatchSyncAt ?? null;

  const statItemStyle: React.CSSProperties = { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 };

  return (
    <AppShell activeScreen="gbp-manager">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {locations.length === 0 ? (
          <>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Google Local SEO</div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>GBP Manager</h1>
            <div className="card" style={{ padding: "48px 20px", textAlign: "center", marginTop: "var(--gutter)", border: "1px dashed var(--ink-300)", boxShadow: "none" }}>
              <p style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)" }}>No locations yet</p>
              <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Add a location and connect it to Google Business Profile to get started.</p>
              <Link href="/locations" className="btn btn-primary" style={{ marginTop: 18 }}><Icon name="pin" size={16} />Go to Locations</Link>
            </div>
          </>
        ) : (
          <>
            {/* Masthead — business profile identity + connection state */}
            <div className="card" style={{ padding: "18px 22px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-softer)", color: "var(--accent)" }}>
                <Icon name="map" size={22} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 680 }}>{accountLabel}</span>
                  {connected ? (
                    <span className="badge badge-success" style={{ height: 20 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />Connected{lastSync ? ` · synced ${shortDate(lastSync)}` : ""}
                    </span>
                  ) : (
                    <Link href="/integrations" className="badge badge-warning" style={{ height: 20 }}>
                      <Icon name="plug" size={11} />Connect Google Business Profile
                    </Link>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4 }} className="tnum">
                  {locations.length} {locations.length === 1 ? "profile" : "profiles"}
                </div>
              </div>
              {portfolio.totalReviews > 0 ? (
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
                    <span className="tnum" style={{ fontSize: 26, fontWeight: 700 }}>{portfolio.portfolioRatingValue.toFixed(1)}</span>
                    <StarRow value={portfolio.portfolioRatingValue} size={15} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-400)" }}>average across all profiles</div>
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <Link href="/gbp/photos" className="btn btn-secondary btn-sm"><Icon name="upload" size={14} />Photos</Link>
                <Link href="/gbp/posts/new" className="btn btn-primary"><Icon name="plus" size={16} />New Google post</Link>
              </div>
            </div>

            {/* Priority zone */}
            {(totalUnreplied > 0 || unansweredQa > 0) ? (
              <div
                className="card"
                style={{ padding: "15px 18px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", border: "1px solid color-mix(in srgb, var(--accent) 22%, var(--ink-200))", background: "color-mix(in srgb, var(--accent) 4%, var(--white))" }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-softer)", color: "var(--accent)" }}>
                  <Icon name="bell" size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 640 }}>Needs your attention</div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)" }} className="tnum">
                    {totalUnreplied > 0 ? `${totalUnreplied} review${totalUnreplied === 1 ? "" : "s"} awaiting reply` : ""}
                    {totalUnreplied > 0 && unansweredQa > 0 ? " · " : ""}
                    {unansweredQa > 0 ? `${unansweredQa} unanswered question${unansweredQa === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                {unansweredQa > 0 ? <Link href="/gbp/qa" className="btn btn-soft btn-sm">Answer Q&amp;A<Icon name="chevRight" size={13} /></Link> : null}
                <Link href="/reviews" className="btn btn-primary btn-sm">Open review inbox<Icon name="chevRight" size={13} /></Link>
              </div>
            ) : null}

            {/* Location profile strip */}
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, marginBottom: "var(--gutter)" }}>
              {reps.map(({ location, rep }) => {
                const up = (rep.ratingDelta ?? 0) >= 0;
                return (
                  <Link
                    key={location.id}
                    href={`/locations/${location.id}`}
                    className="card tap"
                    style={{ flex: "none", width: 222, padding: 14, display: "flex", flexDirection: "column", gap: 10, border: "1px solid var(--ink-150)", textAlign: "left" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `hsl(${rep.hue} 42% 94%)`, color: `hsl(${rep.hue} 55% 32%)` }}>
                        <Icon name="pin" size={14} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.8, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink-900)" }}>{location.name}</div>
                        <div style={{ fontSize: 10.5, marginTop: 2 }}>
                          {rep.gbpConnected
                            ? <span style={{ color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="check" size={10} />Linked</span>
                            : <span className="badge badge-warning" style={{ height: 15, fontSize: 9 }}>Not linked</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span className="tnum" style={{ fontSize: 15, fontWeight: 680 }}>{rep.rating !== null ? rep.rating.toFixed(1) : "—"}</span>
                        {rep.rating !== null ? <StarRow value={rep.rating} size={11} /> : null}
                      </div>
                      {rep.ratingDelta !== null && rep.ratingDelta !== 0 ? <DeltaBadge delta={rep.ratingDelta} /> : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="tnum" style={{ fontSize: 11, color: "var(--ink-400)", flex: 1, minWidth: 0 }}>
                        {rep.reviewCount.toLocaleString()} reviews
                        {rep.pending > 0 ? <span style={{ color: "var(--danger)", fontWeight: 600 }}> · {rep.pending} to reply</span> : null}
                      </span>
                      <Sparkline points={rep.spark} tone={up ? "accent" : "warning"} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Stat rail */}
            <div className="card gbp-statrail" style={{ padding: 0, marginBottom: "var(--gutter)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div style={statItemStyle}>
                <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 540 }}>Avg rating</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="tnum" style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>
                    {portfolio.portfolioRatingValue.toFixed(1)}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--star)" }}>★</span>
                  </span>
                  {ratingDelta !== null && ratingDelta !== 0 ? (
                    <span className="tnum" style={{ fontSize: 11.5, fontWeight: 640, color: ratingDelta >= 0 ? "var(--success)" : "var(--danger)", display: "flex", alignItems: "center", gap: 2 }}>
                      <Icon name="arrowUp" size={10} style={{ transform: ratingDelta >= 0 ? "none" : "rotate(180deg)" }} />{ratingDelta > 0 ? "+" : ""}{ratingDelta.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ ...statItemStyle, borderLeft: "1px solid var(--ink-150)" }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 540 }}>Total reviews</span>
                <span className="tnum" style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>{portfolio.totalReviews.toLocaleString()}</span>
              </div>
              <div style={{ ...statItemStyle, borderLeft: "1px solid var(--ink-150)" }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 540 }}>Awaiting reply</span>
                <span className="tnum" style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1, color: totalUnreplied > 0 ? "var(--warning)" : "var(--ink-900)" }}>{totalUnreplied}</span>
              </div>
            </div>

            {/* Main grid: reply drafts (left) · content (right) */}
            <div className="gbp-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: "var(--gutter)", alignItems: "start" }}>
              {/* AI reply drafts queue */}
              <div className="card" style={{ padding: "var(--card-pad)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em" }}>Reply drafts</h3>
                    <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>Saved drafts from new reviews — approve before they post</p>
                  </div>
                  {totalDraftsPending > 0 ? <Link href="/reviews" className="btn btn-soft btn-sm">Review inbox<Icon name="chevRight" size={13} /></Link> : null}
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {draftReviews.length === 0 ? (
                    <div style={{ padding: "22px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}>No reply drafts pending. New drafts appear here as reviews arrive.</div>
                  ) : (
                    draftReviews.map((d) => (
                      <div key={d.id} style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", padding: 13, background: "var(--ink-50)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                          <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)", fontWeight: 640, fontSize: 11 }}>{initials(d.reviewerName)}</span>
                          <span style={{ fontSize: 12.8, fontWeight: 600 }}>{d.reviewerName}</span>
                          {d.rating !== null ? <StarRow value={d.rating} size={11} /> : null}
                          <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{d.location.name}</span>
                        </div>
                        <p style={{ fontSize: 12.6, color: "var(--ink-600)", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.replyDraft}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
                          <Link href={`/reviews?selected=${d.id}`} className="btn btn-primary btn-sm"><Icon name="check" size={13} />Review &amp; post</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Content column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
                {/* Recent posts */}
                <div className="card" style={{ padding: "var(--card-pad)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em" }}>Recent Google posts</h3>
                      <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>Latest posts across all profiles</p>
                    </div>
                    <Link href="/gbp/posts" className="btn btn-ghost btn-sm">All posts<Icon name="chevRight" size={13} /></Link>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {recentPosts.length === 0 ? (
                      <div style={{ padding: "22px 0", textAlign: "center", color: "var(--ink-400)", fontSize: 13 }}>No posts yet. Create your first Google post.</div>
                    ) : (
                      recentPosts.map((p) => {
                        const sm = postStatusMeta(p.status);
                        const when = p.status === "PUBLISHED" ? p.publishedAt : p.scheduledAt;
                        return (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: "1px solid var(--ink-150)" }}>
                            <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-400)" }}>
                              <Icon name="megaphone" size={15} />
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12.8, fontWeight: 580, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.content}</div>
                              <div style={{ fontSize: 11, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                                <span className={`badge ${sm.cls}`} style={{ height: 16, fontSize: 9.5, paddingLeft: 5 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: sm.dot }} />{sm.label}</span>
                                <span>{POST_TYPE_LABEL[p.postType]} · {p.location.name}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: "var(--ink-400)", flex: "none" }}>{shortDate(when)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Content & Q&A quick actions */}
                <div className="card" style={{ padding: "var(--card-pad)" }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em", marginBottom: 6 }}>Content &amp; Q&amp;A</h3>
                  {([
                    { href: "/gbp/posts", icon: "megaphone" as const, label: "Scheduled posts", value: scheduledPosts, warn: false },
                    { href: "/gbp/photos", icon: "upload" as const, label: "Live photos", value: livePhotos, warn: false },
                    { href: "/gbp/qa", icon: "chat" as const, label: "Unanswered questions", value: unansweredQa, warn: unansweredQa > 0 },
                  ]).map((row) => (
                    <Link key={row.href} href={row.href} className="tap" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 4px", borderTop: "1px solid var(--ink-150)" }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-500)" }}>
                        <Icon name={row.icon} size={15} />
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink-700)", flex: 1 }}>{row.label}</span>
                      <span className="tnum" style={{ fontSize: 16, fontWeight: 680, color: row.warn ? "var(--warning)" : "var(--ink-900)" }}>{row.value}</span>
                      <Icon name="chevRight" size={15} style={{ color: "var(--ink-400)" }} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
