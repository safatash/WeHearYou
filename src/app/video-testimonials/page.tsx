export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { SendVideoRequestForm } from "@/components/send-video-request-form";
import { CopyButton } from "@/components/copy-button";
import { approveVideoTestimonial, rejectVideoTestimonial, deleteVideoTestimonial } from "./actions";
import { VideoThumbnailEditor } from "@/components/video-thumbnail-editor";
import { getThumbnailUrl, getThumbnailAlt } from "@/lib/thumbnail-utils";
import { StatusChips } from "@/components/status-chips";
import { CaptionEditor } from "@/components/caption-editor";
import { featureEnabledForOrg } from "@/lib/plan-features";
import { UpgradeGate } from "@/components/upgrade-gate";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function VideoTestimonialsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireActiveMembershipPage();

  if (!featureEnabledForOrg(membership.organization.planId, "videoTestimonials")) {
    return (
      <AppShell activeScreen="video-testimonials">
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
          <UpgradeGate feature="Video testimonials" planRequired="growth" description="Collecting and showcasing video testimonials is available on Growth and Pro." />
        </div>
      </AppShell>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const query = (await searchParams) ?? {};
  const selectedLocationId = typeof query.location === "string" ? query.location : null;

  const [locations, contactRows] = await Promise.all([
    prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(selectedLocationId ? { id: selectedLocationId } : {}),
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        videoTestimonials: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            token: true,
            prompt: true,
            submitterName: true,
            submitterEmail: true,
            videoUrl: true,
            durationSeconds: true,
            status: true,
            createdAt: true,
            caption: true,
            customThumbnailUrl: true,
            capturedFrameUrl: true,
            capturedFrameTimestamp: true,
            thumbnailSource: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: {
        location: { organizationId: membership.organizationId },
        status: { not: "ARCHIVED" },
      },
      select: { id: true, name: true, email: true, phone: true, locationId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const locationList = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    city: loc.city,
    state: loc.state,
  }));

  const allTestimonials = locations
    .flatMap((loc) =>
      loc.videoTestimonials.map((vt) => ({
        ...vt,
        location: { id: loc.id, name: loc.name, city: loc.city, state: loc.state },
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = allTestimonials.filter((vt) => vt.status === "PENDING" && vt.videoUrl).length;
  const publishedCount = allTestimonials.filter((vt) => vt.status === "APPROVED").length;
  const receivedCount = allTestimonials.filter((vt) => vt.videoUrl).length;

  // Status filter lives in the URL so this page stays a server component.
  const statusFilter = query.status === "pending" || query.status === "published" ? query.status : "all";
  const shown = allTestimonials.filter((vt) =>
    statusFilter === "pending" ? vt.status === "PENDING" && Boolean(vt.videoUrl)
    : statusFilter === "published" ? vt.status === "APPROVED"
    : true,
  );
  const filterHref = (status: string) => {
    const params = new URLSearchParams();
    if (selectedLocationId) params.set("location", selectedLocationId);
    if (status !== "all") params.set("status", status);
    const qs = params.toString();
    return qs ? `/video-testimonials?${qs}` : "/video-testimonials";
  };
  const FILTERS: Array<{ id: string; label: string; count: number }> = [
    { id: "all", label: "All", count: allTestimonials.length },
    { id: "pending", label: "Awaiting review", count: pendingCount },
    { id: "published", label: "Published", count: publishedCount },
  ];

  return (
    <AppShell activeScreen="video-testimonials" selectedLocationId={selectedLocationId ?? undefined}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--gutter)" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Video Testimonials</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Collect and publish video testimonials</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5, maxWidth: 780, lineHeight: 1.5 }}>
            Generate a recording link, share it with a customer, review their submission, and embed published videos on your website.
          </p>
        </div>

        {/* Stats */}
        <div className="vt-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }}>
          {([
            { icon: "film", label: "Total received", value: receivedCount, tone: "neutral" },
            { icon: "clock", label: "Awaiting review", value: pendingCount, tone: "warning" },
            { icon: "check", label: "Published", value: publishedCount, tone: "success" },
          ] as const).map((s) => (
            <div key={s.label} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
              <span
                style={{
                  width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
                  background: s.tone === "warning" ? "var(--warning-soft)" : s.tone === "success" ? "var(--success-soft)" : "var(--ink-100)",
                  color: s.tone === "warning" ? "var(--warning)" : s.tone === "success" ? "var(--success)" : "var(--ink-500)",
                }}
              >
                <Icon name={s.icon} size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="eyebrow" style={{ marginBottom: 5, whiteSpace: "nowrap" }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color: s.tone === "warning" ? "var(--warning)" : s.tone === "success" ? "var(--success)" : "var(--ink-900)" }}>
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Send a video request */}
        <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)" }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 660, letterSpacing: "-.015em" }}>Send a video request</h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4 }}>
              Send a customer a personalised link to record a short video testimonial via email or SMS.
            </p>
          </div>
          {locations.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-500)" }}>Add a location first to send video testimonial requests.</p>
          ) : (
            <SendVideoRequestForm locations={locationList} contacts={contactRows} />
          )}
        </div>

        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 660, letterSpacing: "-.015em" }}>All testimonials</h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>Recorded by your customers · hosted on WeHearYou</p>
            </div>
            <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
              {FILTERS.map((f) => {
                const active = statusFilter === f.id;
                return (
                  <Link
                    key={f.id}
                    href={filterHref(f.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 5, fontSize: 12.5, fontWeight: 560, textDecoration: "none",
                      background: active ? "var(--white)" : "transparent",
                      color: active ? "var(--ink-900)" : "var(--ink-500)",
                      boxShadow: active ? "var(--shadow-xs)" : "none",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {f.label}
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--accent-strong)" : "var(--ink-400)" }}>{f.count}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {shown.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-400)" }}>
              <Icon name="film" size={26} />
              <div style={{ marginTop: 8, fontSize: 13.5 }}>
                {allTestimonials.length === 0
                  ? "No video testimonials yet. Send a request above and share it with a customer."
                  : "No testimonials in this view yet."}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(296px, 1fr))", gap: "var(--gutter)" }}>
              {shown.map((vt) => {
                const recorderUrl = `${appUrl}/vt/${vt.token}`;
                const isPublished = vt.status === "APPROVED";
                const embedCode = isPublished && vt.videoUrl
                  ? `<iframe src="${appUrl}/embed/vt/${vt.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                  : null;

                const thumbnailUrl = getThumbnailUrl({
                  customThumbnailUrl: vt.customThumbnailUrl,
                  capturedFrameUrl: vt.capturedFrameUrl,
                  videoUrl: vt.videoUrl,
                  thumbnailSource: vt.thumbnailSource,
                });

                return (
                  <div
                    key={vt.id}
                    className="card"
                    style={{
                      overflow: "hidden",
                      ...(vt.videoUrl ? {} : { borderStyle: "dashed", opacity: 0.85 }),
                    }}
                  >
                    {/* Thumbnail / Video preview area */}
                    <div className="relative aspect-video" style={{ background: "var(--ink-900)" }}>
                      {vt.videoUrl ? (
                        thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={getThumbnailAlt(vt.submitterName)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={vt.videoUrl}
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl opacity-40">🎥</span>
                        </div>
                      )}

                      {/* Play overlay */}
                      {vt.videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 6px 20px rgba(0,0,0,.32)" }}>
                            <svg width="17" height="17" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="var(--accent)" /></svg>
                          </span>
                        </div>
                      )}

                      {/* Duration badge */}
                      {vt.durationSeconds && (
                        <div className="absolute bottom-2 right-2 tnum" style={{ background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 5 }}>
                          {formatDuration(vt.durationSeconds)}
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Name + location + date */}
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 660, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {vt.submitterName ?? "Unnamed"}
                          </span>
                          <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)", flex: "none" }}>
                            {new Date(vt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {vt.location.name} · {vt.location.city}, {vt.location.state}
                        </div>
                      </div>

                      {/* Status chips */}
                      <StatusChips vt={vt} />

                      {/* Caption preview */}
                      {vt.videoUrl && (
                        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-700)", margin: 0, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {vt.caption ?? <em style={{ color: "var(--ink-400)", fontWeight: 400 }}>No caption yet</em>}
                        </p>
                      )}

                      {/* Recording prompt (collapsible) */}
                      {vt.prompt && (
                        <details>
                          <summary style={{ fontSize: 12, color: "var(--accent-strong)", fontWeight: 540, cursor: "pointer", userSelect: "none" }}>
                            Recording prompt
                          </summary>
                          <div style={{ fontSize: 12.5, color: "var(--ink-500)", background: "var(--ink-50)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-sm)", padding: "8px 11px", fontStyle: "italic", marginTop: 6 }}>
                            {vt.prompt}
                          </div>
                        </details>
                      )}

                      <div className="hr" style={{ margin: "2px 0 0" }} />

                      {/* Actions */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                        {!vt.videoUrl && (
                          <a href={recorderUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                            <Icon name="external" size={13} />Open link
                          </a>
                        )}

                        {vt.videoUrl && (
                          <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                            <Icon name="external" size={13} />Watch
                          </a>
                        )}

                        {vt.videoUrl && (
                          <VideoThumbnailEditor
                            videoId={vt.id}
                            videoUrl={vt.videoUrl ?? ""}
                            durationSeconds={vt.durationSeconds}
                            submitterName={vt.submitterName}
                            caption={vt.caption}
                            locationName={vt.location.name}
                            status={vt.status}
                            customThumbnailUrl={vt.customThumbnailUrl}
                            capturedFrameUrl={vt.capturedFrameUrl}
                            capturedFrameTimestamp={vt.capturedFrameTimestamp}
                            thumbnailSource={vt.thumbnailSource}
                            approveAction={approveVideoTestimonial}
                          />
                        )}

                        {embedCode && (
                          <CopyButton value={embedCode} label="Copy Embed" />
                        )}

                        {vt.videoUrl && vt.status === "PENDING" && (
                          <>
                            <form action={approveVideoTestimonial}>
                              <input type="hidden" name="id" value={vt.id} />
                              <FormSubmitButton idleLabel="Approve & publish" pendingLabel="Publishing…" className="btn btn-primary btn-sm" />
                            </form>
                            <form action={rejectVideoTestimonial}>
                              <input type="hidden" name="id" value={vt.id} />
                              <FormSubmitButton idleLabel="Reject" pendingLabel="Rejecting…" className="btn btn-secondary btn-sm" />
                            </form>
                          </>
                        )}

                        <form action={deleteVideoTestimonial} style={{ marginLeft: "auto" }}>
                          <input type="hidden" name="id" value={vt.id} />
                          <FormSubmitButton idleLabel="Delete" pendingLabel="Deleting…" className="btn btn-ghost btn-sm" />
                        </form>
                      </div>

                      {vt.videoUrl && (
                        <CaptionEditor
                          vtId={vt.id}
                          currentCaption={vt.caption}
                          prompt={vt.prompt}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
