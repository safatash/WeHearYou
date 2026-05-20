feat: add video testimonials dashboard page
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { generateVideoTestimonialLink, approveVideoTestimonial, rejectVideoTestimonial, deleteVideoTestimonial } from "./actions";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PUBLISHED" || status === "APPROVED") {
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

  const locations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      videoTestimonials: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  const allTestimonials = locations
    .flatMap((loc) => loc.videoTestimonials.map((vt) => ({ ...vt, location: { id: loc.id, name: loc.name, city: loc.city, state: loc.state } })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = allTestimonials.filter((vt) => vt.status === "PENDING" && vt.videoUrl).length;
  const publishedCount = allTestimonials.filter((vt) => vt.status === "PUBLISHED" || vt.status === "APPROVED").length;

  return (
    <AppShell activeScreen="video-testimonials">
      <div className="space-y-6">
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
          <h3 className="text-lg font-semibold text-slate-950">Generate a Recording Link</h3>
          <p className="mt-1 text-sm text-slate-600">Create a unique link for a customer to record their video testimonial. Each link is single-use.</p>
          <div className="mt-4">
            {locations.length === 0 ? (
              <p className="text-sm text-slate-500">Add a location first to generate video testimonial links.</p>
            ) : (
              <form action={generateVideoTestimonialLink} className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Location</label>
                  <select name="locationId" required className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}, {loc.state}</option>
                    ))}
                  </select>
                </div>
                <FormSubmitButton idleLabel="Generate link" pendingLabel="Generating..." className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" />
              </form>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">All Testimonials</h3>
          {allTestimonials.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No video testimonials yet. Generate a link above and share it with a customer.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {allTestimonials.map((vt) => {
                const recorderUrl = `${appUrl}/vt/${vt.token}`;
                const isPublished = vt.status === "PUBLISHED" || vt.status === "APPROVED";
                const embedCode = isPublished && vt.videoUrl
                  ? `<iframe src="${appUrl}/embed/vt/${vt.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                  : null;

                return (
                  <div key={vt.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{vt.submitterName ?? "Unnamed"}</p>
                        <p className="text-sm text-slate-500">{vt.location.name} · {vt.location.city}, {vt.location.state}</p>
                        {vt.submitterEmail && <p className="text-xs text-slate-400">{vt.submitterEmail}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={vt.status} />
                          {vt.durationSeconds && <span className="text-xs text-slate-400">{formatDuration(vt.durationSeconds)}</span>}
                          <span className="text-xs text-slate-400">{new Date(vt.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
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
                              <FormSubmitButton idleLabel="Publish" pendingLabel="Publishing..." className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:border-emerald-300" />
                            </form>
                            <form action={rejectVideoTestimonial}>
                              <input type="hidden" name="id" value={vt.id} />
                              <FormSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300" />
                            </form>
                          </>
                        )}
                        {isPublished && vt.videoUrl && (
                          <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">Watch ↗</a>
                        )}
                        <form action={deleteVideoTestimonial}>
                          <input type="hidden" name="id" value={vt.id} />
                          <FormSubmitButton idleLabel="Delete" pendingLabel="Deleting..." className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-rose-600" />
                        </form>
                      </div>
                    </div>
                    {embedCode && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-500">Embed code</p>
                        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                          <code className="flex-1 break-all text-xs text-slate-700">{embedCode}</code>
                        </div>
                      </div>
                    )}
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
