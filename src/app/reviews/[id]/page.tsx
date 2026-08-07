export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { saveReviewFollowUp, saveReviewReply, updateReviewWorkflow } from "@/app/reviews/actions";
import { buildReviewReplyDraft, formatReviewDate, formatReviewSource, formatReviewStatus, formatSentiment, getReviewById, getReviewFilterOptions, stars } from "@/lib/reviews";
import { requireReviewAccessPage } from "@/lib/page-guards";

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const review = await getReviewById(id);

  if (!review) {
    notFound();
  }

  await requireReviewAccessPage(review.locationId);
  const { owners } = await getReviewFilterOptions();

  const isPublicRoute = (review.rating ?? 0) >= 4;
  const sentiment = formatSentiment(review.sentiment);
  const sourceLabel = formatReviewSource(review.source, review.isTestimonial);
  const statusLabel = formatReviewStatus(review.status, review.isTestimonial);
  const replyDraft = review.replyDraft ?? buildReviewReplyDraft(review.reviewerName, review.rating ?? 0);
  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone = typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone) ? query.tone as "success" | "error" | "info" : "success";

  return (
    <AppShell activeScreen="reviews" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/reviews" className="text-sm font-semibold text-indigo-600">
              ← Back to inbox
            </Link>
            <p className="mt-4 eyebrow">Review Detail</p>
            <div className="mt-2 flex items-center gap-4">
              {review.reviewerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="h-14 w-14 rounded-full object-cover" />
              ) : null}
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">{review.reviewerName}</h2>
            </div>
            <p className="mt-3 max-w-3xl text-slate-600">
              Full operator view for response planning, escalation, and location-level reputation context.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="#follow-up" className="btn btn-secondary">Assign Owner</Link>
            <Link href="#reply-tracking" className="btn btn-primary">Track Reply</Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Rating" value={`${review.rating ?? 0}.0 / 5`} meta={stars(review.rating ?? 0)} />
          <StatCard title="Source" value={sourceLabel} meta={formatReviewDate(review.reviewedAt)} />
          <StatCard title="Status" value={statusLabel} meta={isPublicRoute ? "Visible in public reputation flow" : "Needs careful follow-up"} />
          <StatCard title="Sentiment" value={sentiment} meta={review.location.name} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{sourceLabel}</span>
                    <span className="btn btn-primary">{statusLabel}</span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">{review.location.name}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-slate-950">Original review</h3>
                  <p className="mt-2 text-sm text-slate-500">Captured on {formatReviewDate(review.reviewedAt)}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right text-amber-700">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">Rating</p>
                  <p className="mt-1 text-lg font-semibold">{stars(review.rating ?? 0)}</p>
                </div>
              </div>

              <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{review.body}</p>
            </div>

            <div className="panel">
              <h3 className="section-title">Response Planning</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Internal guidance</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {isPublicRoute
                      ? "Strong public review. Best next move is a short thank-you reply, then consider promoting it as a testimonial or mini-site highlight."
                      : "Lower-rating or private feedback. Focus first on service recovery, then decide whether a public response or offline follow-up is more appropriate."}
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Draft reply</p>
                  <textarea
                    className="mt-3 h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none"
                    defaultValue={replyDraft}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="panel">
              <h3 className="section-title">Review Context</h3>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Route" count={isPublicRoute ? "Public review" : "Private feedback"} tone={isPublicRoute ? "positive" : "warning"} />
                <OutcomeCard title="Sentiment" count={sentiment} tone={sentiment === "Negative" ? "warning" : sentiment === "Positive" ? "positive" : "neutral"} />
                <OutcomeCard title="Status" count={statusLabel} tone="neutral" />
              </div>
            </section>

            <section className="panel">
              <h3 className="section-title">Metadata</h3>
              <div className="mt-6 grid gap-4">
                <Field label="Location" value={review.location.name} />
                <Field label="Reviewer" value={review.reviewerName} />
                <Field label="Owner" value={review.ownerMembership?.user.name ?? "Unassigned"} />
                <Field label="Contact Email" value={review.contact?.email ?? "Not captured"} />
                <Field label="Contact Phone" value={review.contact?.phone ?? "Not captured"} />
                <Field label="External ID" value={review.externalId ?? "Not stored"} />
                <Field label="Google Review URL" value={review.sourceReviewUrl ?? "Not stored"} />
              </div>
            </section>

            <section id="follow-up" className="panel">
              <h3 className="section-title">Follow-up Ownership</h3>
              <form action={saveReviewFollowUp} className="mt-6 space-y-4">
                <input type="hidden" name="reviewId" value={review.id} />
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Assign owner
                  <select name="ownerMembershipId" defaultValue={review.ownerMembershipId ?? ""} className="field-value">
                    <option value="">Unassigned</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.user.name} · {owner.user.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Internal notes
                  <textarea
                    name="internalNotes"
                    defaultValue={review.internalNotes ?? ""}
                    placeholder="Capture recovery steps, call notes, promised follow-up, or context for the client team."
                    className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700"
                  />
                </label>

                <FormSubmitButton
                  idleLabel="Save follow-up"
                  pendingLabel="Saving..."
                  className="btn btn-primary"
                />
              </form>
            </section>

            <section id="reply-tracking" className="panel">
              <h3 className="section-title">
                {review.source === "INTERNAL" ? "Reply Management" : review.source === "GOOGLE" ? "Send to Google" : "Reply Tracking"}
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {review.source === "INTERNAL" ? (
                  <>
                    <p><span className="font-semibold text-slate-900">Last published:</span> {review.replyPublishedAt ? formatReviewDate(review.replyPublishedAt) : "Not published yet"}</p>
                    <p><span className="font-semibold text-slate-900">Published by:</span> {review.replySentByMembership?.user.name ?? "Not recorded"}</p>
                    <p className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                      <span className="font-semibold">ℹ️ WeHearYou reviews:</span> Your reply will be published to the widget and mini-site immediately when you click &quot;Publish reply.&quot;
                    </p>
                  </>
                ) : review.source === "GOOGLE" ? (
                  <>
                    <p><span className="font-semibold text-slate-900">Status:</span> {review.replySentAt ? `✓ Sent to Google on ${formatReviewDate(review.replySentAt)}` : "Not sent yet"}</p>
                    {review.replySentAt && <p><span className="font-semibold text-slate-900">Sent by:</span> {review.replySentByMembership?.user.name ?? "Not recorded"}</p>}
                    <p className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <span className="font-semibold">ℹ️ Google replies:</span> Once you send, the reply will appear on Google Business Profile. Safety checks prevent risky content.
                    </p>
                  </>
                ) : (
                  <>
                    <p><span className="font-semibold text-slate-900">Last sent:</span> {review.replySentAt ? formatReviewDate(review.replySentAt) : "Not sent yet"}</p>
                    <p><span className="font-semibold text-slate-900">Sent by:</span> {review.replySentByMembership?.user.name ?? "Not recorded"}</p>
                    <p><span className="font-semibold text-slate-900">External reply:</span> {review.sourceReplyText ?? "Not imported"}</p>
                  </>
                )}
              </div>

              <form action={saveReviewReply} className="mt-6 space-y-4">
                <input type="hidden" name="reviewId" value={review.id} />
                {review.source === "GOOGLE" && <input type="hidden" name="sendToGoogle" value="true" />}
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  {review.source === "INTERNAL" ? "Reply text" : "Reply text"}
                  <textarea
                    name="replyDraft"
                    defaultValue={replyDraft}
                    disabled={review.replySentAt ? true : false}
                    className={`min-h-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700 ${review.replySentAt && review.source === "GOOGLE" ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" name="markSent" value="false" className="btn btn-secondary">
                    Save draft
                  </button>
                  <button type="submit" name="markSent" value="true" disabled={review.replySentAt ? true : false} className={`rounded-2xl px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white ${review.replySentAt && review.source === "GOOGLE" ? "bg-slate-300 cursor-not-allowed" : "bg-slate-950"}`}>
                    {review.source === "INTERNAL" ? "Publish reply" : review.source === "GOOGLE" ? (review.replySentAt ? "✓ Sent to Google" : "Send to Google") : "Mark reply as sent"}
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <h3 className="section-title">Suggested Actions</h3>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Assign this thread to the location manager or client lead</div>
                <div className="rounded-2xl bg-slate-50 p-4">Save a polished reply draft before sending publicly</div>
                <div className="rounded-2xl bg-slate-50 p-4">Log the follow-up outcome so reporting stays clean</div>
              </div>

              <form action={updateReviewWorkflow} className="mt-6">
                <input type="hidden" name="reviewId" value={review.id} />
                <button
                  type="submit"
                  name="intent"
                  value="mark-follow-up"
                  disabled={review.status === "NEEDS_FOLLOW_UP"}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${review.status === "NEEDS_FOLLOW_UP" ? "border border-slate-200 bg-white text-slate-400" : "bg-amber-500 !text-white visited:!text-white hover:!text-white"}`}
                >
                  {review.status === "NEEDS_FOLLOW_UP" ? "Marked for follow-up" : "Mark needs follow-up"}
                </button>
              </form>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <form action={updateReviewWorkflow}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" name="intent" value="mark-private" className="w-full btn btn-secondary">
                    Mark private feedback
                  </button>
                </form>
                <form action={updateReviewWorkflow}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" name="intent" value="mark-published" className="w-full btn btn-secondary">
                    Mark published
                  </button>
                </form>
                <form action={updateReviewWorkflow}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" name="intent" value="toggle-testimonial" className="w-full btn btn-secondary">
                    {review.isTestimonial ? "Remove testimonial" : "Promote to testimonial"}
                  </button>
                </form>
                <form action={updateReviewWorkflow}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" name="intent" value="toggle-widget" className="w-full btn btn-secondary">
                    {review.isWidgetVisible ? "Hide from widget" : "Show in widget"}
                  </button>
                </form>
                <form action={updateReviewWorkflow} className="sm:col-span-2">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button type="submit" name="intent" value="toggle-featured" className="w-full btn btn-secondary">
                    {review.isFeatured ? "Remove featured flag" : "Mark as featured"}
                  </button>
                </form>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
