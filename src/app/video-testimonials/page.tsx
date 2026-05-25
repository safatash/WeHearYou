export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { SendVideoRequestForm } from "@/components/send-video-request-form";
import { CopyButton } from "@/components/copy-button";
import { approveVideoTestimonial, rejectVideoTestimonial, deleteVideoTestimonial } from "./actions";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatusBadge({ status, hasVideo }: { status: string; hasVideo: boolean }) {
  if (!hasVideo) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting</span>;
  }
  if (status === "APPROVED") {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Published</span>;
  }
  if (status === "REJECTED") {
    return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-rose-700">Rejected</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</span>;
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
            <div className="mt-4 space-y-4">
              {allTestimonials.map((vt) => {
                const recorderUrl = `${appUrl}/vt/${vt.token}`;
                const isPublished = vt.status === "APPROVED";
                const embedCode = isPublished && vt.videoUrl
                  ? `<iframe src="${appUrl}/embed/vt/${vt.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                  : null;

                return (
                  <div
                    key={vt.id}
                    className={`rounded-2xl border p-4 ${!vt.videoUrl ? "border-dashed border-slate-200 opacity-75" : "border-slate-200"}`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Thumbnail */}
                      {vt.videoUrl ? (
                        <video
                          src={vt.videoUrl}
                          preload="metadata"
                          className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-900 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-2xl">
                          🎥
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{vt.submitterName ?? "Unnamed"}</span>
                          <StatusBadge status={vt.status} hasVideo={!!vt.videoUrl} />
                          {vt.durationSeconds && (
                            <span className="text-xs text-slate-400">{formatDuration(vt.durationSeconds)}</span>
                          )}
                          <span className="text-xs text-slate-400">
                            {!vt.videoUrl ? "Sent " : ""}{new Date(vt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">{vt.location.name} · {vt.location.city}, {vt.location.state}</p>
                        {vt.prompt && (
                          <p className="text-xs text-slate-400 italic mb-2">&ldquo;{vt.prompt}&rdquo;</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {!vt.videoUrl && (
                            <a href={recorderUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">
                              Open recorder link ↗
                            </a>
                          )}
                          {vt.videoUrl && vt.status === "PENDING" && (
                            <>
                              <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">Watch ↗</a>
                              <form action={approveVideoTestimonial}>
                                <input type="hidden" name="id" value={vt.id} />
                                <FormSubmitButton idleLabel="Publish" pendingLabel="Publishing…" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:border-emerald-300" />
                              </form>
                              <form action={rejectVideoTestimonial}>
                                <input type="hidden" name="id" value={vt.id} />
                                <FormSubmitButton idleLabel="Reject" pendingLabel="Rejecting…" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300" />
                              </form>
                            </>
                          )}
                          {isPublished && vt.videoUrl && (
                            <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">Watch ↗</a>
                          )}
                          <form action={deleteVideoTestimonial}>
                            <input type="hidden" name="id" value={vt.id} />
                            <FormSubmitButton idleLabel="Delete" pendingLabel="Deleting…" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-rose-600" />
                          </form>
                        </div>

                        {embedCode && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2">
                            <code className="flex-1 truncate text-xs text-slate-600">{embedCode}</code>
                            <CopyButton value={embedCode} label="Copy" />
                          </div>
                        )}
                      </div>
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
