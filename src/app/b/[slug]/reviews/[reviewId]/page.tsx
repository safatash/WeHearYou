export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatReviewDate } from "@/lib/reviews";

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const filled = Math.round(rating);
  return (
    <span className={size === "lg" ? "text-2xl text-amber-400" : "text-sm text-amber-400"}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

function ReviewerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) return <img src={photoUrl} alt={name} className="h-12 w-12 shrink-0 rounded-full object-cover" />;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-indigo-100 text-indigo-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-sky-100 text-sky-700"];
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors[name.charCodeAt(0) % colors.length]}`}>
      {initials || "?"}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; reviewId: string }>;
}): Promise<Metadata> {
  const { slug, reviewId } = await params;

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      location: { slug },
      source: "INTERNAL",
      status: "PUBLISHED",
    },
    include: {
      location: true,
    },
  });

  if (!review) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${review.reviewerName}'s Review of ${review.location.name}`;
  const description = review.body.slice(0, 160);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${process.env.NEXT_PUBLIC_APP_URL}/b/${slug}/reviews/${reviewId}`,
    },
  };
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ slug: string; reviewId: string }>;
}) {
  const { slug, reviewId } = await params;

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      location: { slug },
      source: "INTERNAL",
      status: "PUBLISHED",
    },
    include: {
      location: {
        include: {
          publicProfile: true,
        },
      },
    },
  });

  if (!review) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href={`/b/${slug}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            ← Back to {review.location.name}
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          {/* Reviewer Info */}
          <div className="mb-6 flex items-start gap-4">
            <ReviewerAvatar name={review.reviewerName} photoUrl={review.reviewerPhotoUrl} />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-950">{review.reviewerName}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {formatReviewDate(review.reviewedAt ?? review.createdAt)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={review.rating ?? 0} />
                <span className="text-sm font-semibold text-slate-600">{review.rating ?? 0}.0 / 5.0</span>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700">
              WeHearYou Review
            </span>
          </div>

          {/* Review Body */}
          <div className="mb-6 rounded-2xl bg-slate-50 p-5">
            <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">{review.body}</p>
          </div>

          {/* Reply Section */}
          {review.replyPublishedAt && review.replyDraft ? (
            <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Response from {review.location.name}</p>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-emerald-900">{review.replyDraft}</p>
            </div>
          ) : null}

          {/* Divider */}
          <div className="mb-6 border-t border-slate-200" />

          {/* CTA Section */}
          <div className="space-y-4">
            <p className="text-center text-sm font-semibold text-slate-600">
              Have your own experience to share?
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={`/review/${slug}`}
                className="rounded-2xl bg-indigo-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Share Your Feedback
              </a>
              <a
                href={`/b/${slug}`}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                View All Reviews
              </a>
            </div>
          </div>
        </div>

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Review",
              author: {
                "@type": "Person",
                name: review.reviewerName,
              },
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: "5",
                worstRating: "1",
              },
              reviewBody: review.body,
              datePublished: review.createdAt?.toISOString() ?? new Date().toISOString(),
              itemReviewed: {
                "@type": "LocalBusiness",
                name: review.location.name,
              },
            }),
          }}
        />
      </div>
    </main>
  );
}
