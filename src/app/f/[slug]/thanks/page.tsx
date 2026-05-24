export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicFunnelThanksData } from "../actions";

export default async function PublicFunnelThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const mode = typeof query.mode === "string" ? query.mode : "public";
  const data = await getPublicFunnelThanksData(slug);

  if (!data) {
    notFound();
  }

  const { location, reviewLink } = data;
  const isPrivate = mode === "private";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Thank You</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {isPrivate
            ? location.publicProfile?.funnelThanksPrivateTitle ?? "Thanks for sharing your feedback"
            : location.publicProfile?.funnelThanksPublicTitle ?? `Thanks for rating ${location.name}`}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {isPrivate
            ? location.publicProfile?.funnelThanksPrivateBody ?? "Your feedback has been sent privately to the team."
            : location.publicProfile?.funnelThanksPublicBody ?? "One final step, post your review publicly if you'd like to help other customers discover this business."}
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Your rating:</span> {rating > 0 ? `${rating} / 5` : "Not captured"}
          </p>
          <p className="mt-2">
            {isPrivate
              ? "The team can now review your private feedback internally."
              : "Your public review helps strengthen trust for future customers."}
          </p>
        </div>

        {!isPrivate && reviewLink ? (
          <div className="mt-8">
            <Link href={reviewLink} className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {location.publicProfile?.funnelReviewButtonLabel ?? "Leave a Google review"}
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <Link href={`/b/${location.slug}`} className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Finish
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
