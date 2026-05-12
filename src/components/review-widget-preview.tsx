type ReviewWidgetPreviewProps = {
  businessName: string;
  avgRating?: number | null;
  reviewCount: number;
  reviews: Array<{
    id: string;
    reviewerName: string;
    reviewerPhotoUrl?: string | null;
    sourceReviewUrl?: string | null;
    sourceReplyText?: string | null;
    rating: number;
    body: string;
    reviewedAt?: string | null;
  }>;
  showHeader: boolean;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showWriteReview: boolean;
  reviewLink?: string | null;
};

function stars(rating: number) {
  return "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

export function ReviewWidgetPreview({
  businessName,
  avgRating,
  reviewCount,
  reviews,
  showHeader,
  showRating,
  showReviewerName,
  showDate,
  showWriteReview,
  reviewLink,
}: ReviewWidgetPreviewProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {showHeader ? (
          <div className="mb-4">
            <p className="text-xl font-semibold text-slate-950">{businessName}</p>
            <p className="text-sm text-slate-500">
              {typeof avgRating === "number" ? `${avgRating.toFixed(1)} ★` : ""} {reviewCount > 0 ? `(${reviewCount} reviews)` : ""}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                {showRating ? <div className="mb-2 text-sm text-amber-500">{stars(review.rating)}</div> : null}
                {showReviewerName ? (
                  <div className="mb-2 flex items-center gap-3">
                    {review.reviewerPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {review.reviewerName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="font-semibold text-slate-900">{review.reviewerName}</div>
                  </div>
                ) : null}
                <div className="text-sm leading-6 text-slate-600">{review.body}</div>
                {review.sourceReplyText ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                    <span className="font-semibold text-slate-700">Owner reply:</span> {review.sourceReplyText}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  {showDate && review.reviewedAt ? <div className="text-xs text-slate-400">{formatDate(review.reviewedAt)}</div> : <div />}
                  {review.sourceReviewUrl ? (
                    <a href={review.sourceReviewUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600">
                      View on Google
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No published Google reviews match this widget yet.
            </div>
          )}
        </div>

        {showWriteReview && reviewLink ? (
          <div className="mt-5">
            <a
              href={reviewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-2xl text-sm font-semibold text-indigo-600"
            >
              Write a review
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
