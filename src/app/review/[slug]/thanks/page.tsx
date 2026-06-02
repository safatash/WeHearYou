import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ReviewLinkThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: { name: true },
  });

  if (!location) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <div className="text-5xl mb-4">🙏</div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
          {location.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Thank you</h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          We take every message seriously and will follow up if you&apos;ve provided contact information.
        </p>
        <Link
          href={`/review/${slug}`}
          className="mt-6 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
