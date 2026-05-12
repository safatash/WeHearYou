export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/social-icons";
import { PublicShareButton } from "@/components/public-share-button";
import {
  buildLocalBusinessSchema,
  getPublicLocationBySlug,
  getPublicProfileStats,
  getVisiblePublicReviews,
  getVisibleTestimonials,
} from "@/lib/public-profile";
import { formatReviewDate, formatReviewSource, truncateReviewBody, stars } from "@/lib/reviews";

export default async function BusinessMiniSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await getPublicLocationBySlug(slug);

  if (!location) {
    notFound();
  }

  const profile = location.publicProfile;
  const stats = getPublicProfileStats(location);
  const publicReviews = getVisiblePublicReviews(location);
  const testimonials = getVisibleTestimonials(location);
  const schema = buildLocalBusinessSchema(location);
  const reviewDestination = location.reviewLink || profile?.ctaUrl || null;
  const hours = profile?.googleHours?.split("\n").filter(Boolean) ?? [];
  const mapUrl = profile?.googleMapsUrl ?? null;
  const fullAddress = [profile?.addressLine1, profile?.addressLine2, location.city, location.state, profile?.postalCode].filter(Boolean).join(", ");
  const bookingUrl = profile?.bookingUrl || profile?.ctaUrl || null;
  const shareUrl = profile?.customDomain
    ? `https://${profile.customDomain}`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/b/${location.slug}`;
  const socialLinks = [
    profile?.facebookUrl ? { label: "Facebook", href: profile.facebookUrl, icon: <FacebookIcon /> } : null,
    profile?.xUrl ? { label: "X", href: profile.xUrl, icon: <XIcon /> } : null,
    profile?.instagramUrl ? { label: "Instagram", href: profile.instagramUrl, icon: <InstagramIcon /> } : null,
    profile?.linkedinUrl ? { label: "LinkedIn", href: profile.linkedinUrl, icon: <LinkedInIcon /> } : null,
    profile?.youtubeUrl ? { label: "YouTube", href: profile.youtubeUrl, icon: <YouTubeIcon /> } : null,
    profile?.tiktokUrl ? { label: "TikTok", href: profile.tiktokUrl, icon: <TikTokIcon /> } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {profile?.schemaEnabled ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /> : null}

      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Business Profile</p>
              {profile?.logoUrl ? <img src={profile.logoUrl} alt={`${location.name} logo`} className="mt-6 h-16 w-auto rounded-xl object-contain" /> : null}
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">{profile?.headline || location.name}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {profile?.subheadline || `Trusted local service in ${location.city}, ${location.state}, with reviews, contact details, and quick ways to get in touch.`}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {bookingUrl ? (
                  <a href={bookingUrl} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                    {profile?.ctaLabel || "Book now"}
                  </a>
                ) : null}
                <Link href={`/f/${location.slug}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950">
                  Leave a review
                </Link>
                <PublicShareButton title={profile?.headline || location.name} url={shareUrl} />
                {profile?.phone ? (
                  <a href={`tel:${profile.phone}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950">
                    Call {profile.phone}
                  </a>
                ) : null}
              </div>

              {socialLinks.length > 0 ? (
                <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">Socials</span>
                  {socialLinks.map((link) => (
                    <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 font-semibold !text-slate-900 visited:!text-slate-900 transition hover:border-indigo-200 hover:!text-indigo-700">
                      {link.icon}
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Why people choose us</p>
                <div className="mt-5">
                  <p className="text-3xl font-semibold text-slate-950">{stats.averageRating} ★</p>
                  <p className="mt-2 text-sm text-slate-500">Average rating</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">Quick contact</p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
                  <p><span className="font-semibold text-white">Phone:</span> {profile?.phone || "Not listed"}</p>
                  <p><span className="font-semibold text-white">Email:</span> {profile?.email || "Not listed"}</p>
                  <p><span className="font-semibold text-white">Address:</span> {fullAddress || `${location.city}, ${location.state}`}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {bookingUrl ? (
                    <a href={bookingUrl} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold !text-slate-950 visited:!text-slate-950 hover:!text-slate-950">
                      {profile?.ctaLabel || "Book now"}
                    </a>
                  ) : null}
                  {mapUrl ? (
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white">
                      Directions
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Business Info</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p><span className="font-semibold text-slate-900">Phone:</span> {profile?.phone || "Not listed"}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {profile?.email || "Not listed"}</p>
              <p><span className="font-semibold text-slate-900">Address:</span> {fullAddress || "Not listed"}</p>
              {mapUrl ? (
                <p>
                  <span className="font-semibold text-slate-900">Map:</span>{" "}
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600">
                    Open in Google Maps
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          {profile?.showHours && hours.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Business Hours</h2>
              <div className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
                {hours.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}

          {profile?.showMap ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Find Us</h2>
              {mapUrl ? (
                <div className="mt-4 space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="flex h-48 items-end bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.18),transparent_26%),linear-gradient(135deg,#e2e8f0_0%,#f8fafc_45%,#dbeafe_100%)] p-5">
                      <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Google Maps</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{profile?.headline || location.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{fullAddress || `${location.city}, ${location.state}`}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Visit or get directions</p>
                    <p className="mt-2">Open the live Google Maps listing for directions, nearby context, and place details.</p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                        Open Google Maps
                      </a>
                      {profile?.phone ? (
                        <a href={`tel:${profile.phone}`} className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                          Call location
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Serving customers in {location.city}, {location.state}. Map data will appear here after Google Business Profile mapping is connected.
                </p>
              )}
            </div>
          ) : null}
        </aside>

        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Public Reviews</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Reputation customers can trust</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Real customer feedback, surfaced directly on this location page so visitors can see the quality of service before they reach out.
                </p>
              </div>
              {reviewDestination ? (
                <a href={reviewDestination} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                  Leave a review
                </a>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Average rating</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.averageRating} ★</p>
                <p className="mt-2 text-sm text-slate-500">Based on visible reviews and testimonials</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Published reviews</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.publicReviewCount}</p>
                <p className="mt-2 text-sm text-slate-500">Google and Facebook feedback shown publicly</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Testimonials</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.testimonialCount}</p>
                <p className="mt-2 text-sm text-slate-500">Promoted customer proof for this location</p>
              </div>
            </div>

            {publicReviews.length > 0 ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {publicReviews.map((review) => (
                  <article key={review.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{review.reviewerName}</p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {formatReviewSource(review.source, review.isTestimonial)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-amber-500">{stars(review.rating)}</p>
                      </div>
                      <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-400">
                        <p>{formatReviewDate(review.reviewedAt)}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{truncateReviewBody(review.body, 260)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                This location does not have public reviews published yet. {reviewDestination ? "Be the first to leave feedback." : "Check back soon for verified customer feedback."}
              </div>
            )}
          </section>

          {testimonials.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Testimonials</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">What customers are saying</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {testimonials.map((review) => (
                  <article key={review.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{review.reviewerName}</p>
                        <p className="mt-1 text-sm text-amber-500">{stars(review.rating)}</p>
                      </div>
                      <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-400">
                        <p>Testimonial</p>
                        <p className="mt-1">{formatReviewDate(review.reviewedAt)}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{review.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
