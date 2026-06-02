export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/social-icons";
import { PublicShareButton } from "@/components/public-share-button";
import type { Metadata } from "next";
import { getPublicLocationBySlug, getPublicProfileStats, getVisiblePublicReviews, getVisibleTestimonials } from "@/lib/public-profile";
import { buildLocalBusinessSchema, buildLocationMetadata } from "@/lib/seo";
import { formatReviewDate, formatReviewSource, truncateReviewBody } from "@/lib/reviews";

const REVIEWS_PER_PAGE = 5;

function parseHoursLines(googleHours: string | null | undefined) {
  if (!googleHours) return [];
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const short = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return googleHours.split("\n").filter(Boolean).map((line) => {
    const colonIdx = line.indexOf(":");
    const day = colonIdx > 0 ? line.slice(0, colonIdx).trim() : line;
    const hrs = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : "";
    const dayIndex = days.findIndex((d) => day.toLowerCase().startsWith(d.toLowerCase()));
    const todayIndex = (new Date().getDay() + 6) % 7;
    return { day: dayIndex >= 0 ? short[dayIndex] : day, hours: hrs, isToday: dayIndex === todayIndex };
  });
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const filled = Math.round(rating);
  return (
    <span className={size === "lg" ? "text-2xl text-amber-400" : "text-sm text-amber-400"}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

function ReviewerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) return <img src={photoUrl} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-indigo-100 text-indigo-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-sky-100 text-sky-700"];
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors[name.charCodeAt(0) % colors.length]}`}>
      {initials || "?"}
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const location = await getPublicLocationBySlug(slug);
  if (!location) return { robots: { index: false, follow: false } };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app";
  const defaultOgImage = process.env.NEXT_PUBLIC_OG_IMAGE ?? null;
  return buildLocationMetadata(location, baseUrl, defaultOgImage);
}

export default async function BusinessMiniSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(typeof query.page === "string" ? query.page : "1") || 1);

  const location = await getPublicLocationBySlug(slug);
  if (!location) notFound();

  const profile = location.publicProfile;
  const stats = getPublicProfileStats(location);
  const publicReviews = getVisiblePublicReviews(location);
  const testimonials = getVisibleTestimonials(location);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app";
  const schema = buildLocalBusinessSchema(location, baseUrl);
  const reviewDestination = location.reviewLink || profile?.ctaUrl || null;
  const hours = parseHoursLines(profile?.googleHours);
  const mapUrl = profile?.googleMapsUrl ?? null;
  const fullAddress = [profile?.addressLine1, location.city, location.state, profile?.postalCode].filter(Boolean).join(", ");
  const bookingUrl = profile?.bookingUrl || profile?.ctaUrl || null;
  const phone = profile?.phone || null;
  const email = profile?.email || null;
  const shareUrl = profile?.customDomain ? `https://${profile.customDomain}` : `${process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"}/b/${location.slug}`;
  const heroImage = profile?.heroImageUrl ?? null;
  const logoUrl = profile?.logoUrl ?? null;
  const allReviews = [...publicReviews, ...testimonials];
  const totalReviews = allReviews.length;
  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
  const paginatedReviews = allReviews.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE);
  const displayRating = stats.averageRating !== "0.0" ? stats.averageRating : (location.avgRating?.toFixed(1) ?? null);
  const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "";

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

      {/* HERO */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
        {heroImage ? (
          <img src={heroImage} alt={location.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_50%,rgba(99,102,241,0.5),transparent_60%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.4),transparent_55%),linear-gradient(135deg,#1e1b4b_0%,#312e81_50%,#1e3a5f_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* PROFILE HEADER */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative -mt-14 sm:-mt-16">
          {logoUrl ? (
            <img src={logoUrl} alt={location.name} className="h-24 w-24 rounded-2xl border-4 border-white object-contain bg-white shadow-lg sm:h-28 sm:w-28" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-indigo-600 shadow-lg sm:h-28 sm:w-28">
              <span className="text-3xl font-bold text-white" style={{ color: "white" }}>{location.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="mt-3">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{profile?.headline || location.name}</h1>
          {displayRating && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StarRating rating={parseFloat(displayRating)} />
              <span className="text-sm font-semibold text-slate-700">{displayRating}</span>
              {totalReviews > 0 && <span className="text-sm text-slate-500">({totalReviews} reviews)</span>}
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm text-slate-500">{location.city}, {location.state}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-5">
          {reviewDestination ? (
            <a href={reviewDestination} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm"
              style={{ color: "white" }}>
              <GoogleIcon /> Write a review
            </a>
          ) : (
            <Link href={`/f/${location.slug}`}
              className="inline-flex rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm"
              style={{ color: "white" }}>
              Write a review
            </Link>
          )}
          {bookingUrl && (
            <a href={bookingUrl} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
              {profile?.ctaLabel || "Book appointment"}
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
              📞 {phone}
            </a>
          )}
          <PublicShareButton title={profile?.headline || location.name} url={shareUrl} />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">

          {/* SIDEBAR */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Business info</h2>
              <div className="mt-4 space-y-3 text-sm">
                {fullAddress && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-slate-400">📍</span>
                    <div>
                      <p className="text-slate-700">{fullAddress}</p>
                      {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline">Get directions →</a>}
                    </div>
                  </div>
                )}
                {phone && (
                  <div className="flex gap-3">
                    <span className="shrink-0 text-slate-400">📞</span>
                    <a href={`tel:${phone}`} className="text-slate-700 hover:text-indigo-600">{phone}</a>
                  </div>
                )}
                {email && (
                  <div className="flex gap-3">
                    <span className="shrink-0 text-slate-400">✉️</span>
                    <a href={`mailto:${email}`} className="truncate text-slate-700 hover:text-indigo-600">{email}</a>
                  </div>
                )}
                {profile?.bookingUrl && (
                  <div className="flex gap-3">
                    <span className="shrink-0 text-slate-400">🌐</span>
                    <a href={profile.bookingUrl} target="_blank" rel="noreferrer" className="truncate text-slate-700 hover:text-indigo-600">
                      {profile.bookingUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </div>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {socialLinks.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold !text-slate-700 visited:!text-slate-700 hover:border-indigo-200 hover:!text-indigo-700 transition">
                      {link.icon}{link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {hours.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">Business hours</h2>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    {hours.map(({ day, hours: h, isToday }) => (
                      <tr key={day} className={isToday ? "font-semibold text-indigo-700" : "text-slate-600"}>
                        <td className="py-1 pr-4 w-10">{day}</td>
                        <td className="py-1">{h || "Closed"}</td>
                        {isToday && <td className="py-1 pl-2 text-xs text-indigo-400">Today</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mapUrl && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">Location</h2>
                <div className="mt-3 overflow-hidden rounded-2xl">
                  {mapsEmbedKey && location.googlePlaceId ? (
                    <iframe title="Map" width="100%" height="180" style={{ border: 0 }} loading="lazy" allowFullScreen
                      src={`https://www.google.com/maps/embed/v1/place?key=${mapsEmbedKey}&q=place_id:${location.googlePlaceId}`} />
                  ) : (
                    <a href={mapUrl} target="_blank" rel="noreferrer"
                      className="flex h-36 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-indigo-600 hover:bg-slate-200 transition">
                      View on Google Maps →
                    </a>
                  )}
                </div>
                <a href={mapUrl} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                  Get directions
                </a>
              </div>
            )}

            {displayRating && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">Rating summary</h2>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-slate-950">{displayRating}</p>
                  <StarRating rating={parseFloat(displayRating)} />
                  <p className="mt-1 text-xs text-slate-500">{totalReviews} reviews</p>
                </div>
                {reviewDestination && (
                  <a href={reviewDestination} target="_blank" rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm hover:bg-slate-800 transition"
                    style={{ color: "white" }}>
                    Write a review
                  </a>
                )}
              </div>
            )}
          </aside>

          {/* REVIEWS */}
          <div className="space-y-5">
            {profile?.showAiReviewSummary && profile?.aiReviewSummary && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-indigo-600">✦ AI Summary</p>
                  {profile.aiReviewSummaryReviewCount && (
                    <p className="text-xs text-indigo-400">Based on {profile.aiReviewSummaryReviewCount} reviews</p>
                  )}
                </div>
                <p className="text-sm leading-7 text-indigo-900">{profile.aiReviewSummary}</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Reviews {totalReviews > 0 && <span className="text-slate-400">({totalReviews})</span>}
              </h2>
              {reviewDestination && (
                <a href={reviewDestination} target="_blank" rel="noreferrer"
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                  + Write a review
                </a>
              )}
            </div>

            {paginatedReviews.length > 0 ? (
              <>
                <div className="space-y-4">
                  {paginatedReviews.map((review) => (
                    <article key={review.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <ReviewerAvatar name={review.reviewerName} photoUrl={review.reviewerPhotoUrl} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{review.reviewerName}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <StarRating rating={review.rating ?? 0} />
                                <span className="text-xs text-slate-400">{formatReviewSource(review.source, review.isTestimonial)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 shrink-0">{formatReviewDate(review.reviewedAt)}</p>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{truncateReviewBody(review.body, 320)}</p>
                          {review.sourceReviewUrl && (
                            <a href={review.sourceReviewUrl} target="_blank" rel="noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline">
                              View on Google →
                            </a>
                          )}
                          {(review.replyPublishedAt || review.replySentAt) && review.replyDraft && (
                            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                              <p className="text-xs font-semibold text-slate-500 mb-1">Response from the owner</p>
                              <p className="text-sm leading-7 text-slate-700">{review.replyDraft}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {page > 1 && (
                      <Link href={`/b/${slug}?page=${page - 1}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                        ← Previous
                      </Link>
                    )}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Link key={p} href={`/b/${slug}?page=${p}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${p === page ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                          style={p === page ? { color: "white" } : {}}>
                          {p}
                        </Link>
                      ))}
                    </div>
                    {page < totalPages && (
                      <Link href={`/b/${slug}?page=${page + 1}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                        Next →
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-900">No reviews yet</p>
                <p className="mt-2 text-sm text-slate-500">Be the first to leave a review for {location.name}.</p>
                {reviewDestination && (
                  <a href={reviewDestination} target="_blank" rel="noreferrer"
                    className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm hover:bg-slate-800 transition"
                    style={{ color: "white" }}>
                    Write a review
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
