export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
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

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function VideoTestimonialsPage() {
  const membership = await requireActiveMembershipPage();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [locations, contactRows] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: membership.organizationId },
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

  return (
    <AppShell activeScreen="video-testimonials">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Video Testimonials</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Collect and publish video testimonials</h2>
          <p className="mt-2 text-sm text-slate-600">Generate a recording link, share it with a customer, review their submission, and embed published videos on your website.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Received</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">{allTestimonials.filter((vt) => vt.videoUrl).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting Review</p>
            <p className="mt-1 text-3xl font-semibold text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-600">{publishedCount}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Send a Video Request</h3>
          <p className="mt-1 mb-5 text-sm text-slate-600">Send a customer a personalised link to record a short video testimonial via email or SMS.</p>
          {locations.length === 0 ? (
            <p className="text-sm text-slate-500">Add a location first to send video testimonial requests.</p>
          ) : (
            <SendVideoRequestForm locations={locationList} contacts={contactRows} />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">All Testimonials</h3>
          {allTestimonials.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No video testimonials yet. Send a request above and share it with a customer.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTestimonials.map((vt) => {
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
                    className={`rounded-2xl border bg-white overflow-hidden hover:shadow-md transition-shadow ${
                      !vt.videoUrl ? "border-dashed border-slate-200 opacity-80" : "border-slate-200"
                    }`}
                  >
                    {/* Thumbnail / Video preview area */}
                    <div className="relative aspect-video bg-slate-900">
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
                          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Duration badge */}
                      {vt.durationSeconds && (
                        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white font-mono">
                          {formatDuration(vt.durationSeconds)}
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      {/* Name + location + date */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{vt.submitterName ?? "Unnamed"}</h3>
                          <p className="text-xs text-slate-500 truncate">{vt.location.name} · {vt.location.city}, {vt.location.state}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                          {new Date(vt.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Status chips */}
                      <StatusChips vt={vt} />

                      {/* Caption preview */}
                      {vt.videoUrl && (
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                          {vt.caption ?? <em className="text-slate-400">No caption yet</em>}
                        </p>
                      )}

                      {/* Recording prompt (collapsible) */}
                      {vt.prompt && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600">
                            Recording prompt ↓
                          </summary>
                          <p className="mt-1 text-xs text-slate-500 italic pl-2 border-l border-slate-200">{vt.prompt}</p>
                        </details>
                      )}

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                        {!vt.videoUrl && (
                          <a
                            href={recorderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
                          >
                            Open link ↗
                          </a>
                        )}

                        {vt.videoUrl && (
                          <a
                            href={vt.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
                          >
                            Watch ↗
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
                              <FormSubmitButton
                                idleLabel="Publish"
                                pendingLabel="Publishing…"
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:border-emerald-300"
                              />
                            </form>
                            <form action={rejectVideoTestimonial}>
                              <input type="hidden" name="id" value={vt.id} />
                              <FormSubmitButton
                                idleLabel="Reject"
                                pendingLabel="Rejecting…"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300"
                              />
                            </form>
                          </>
                        )}

                        <form action={deleteVideoTestimonial}>
                          <input type="hidden" name="id" value={vt.id} />
                          <FormSubmitButton
                            idleLabel="Delete"
                            pendingLabel="Deleting…"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-rose-200 hover:text-rose-600"
                          />
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
        </section>
      </div>
    </AppShell>
  );
}
