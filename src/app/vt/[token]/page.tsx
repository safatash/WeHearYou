import { notFound } from "next/navigation";
import { getVideoTestimonialByToken } from "@/lib/video-testimonials";
import { VideoRecorder } from "@/components/video-recorder";

export default async function VideoTestimonialRecorderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const testimonial = await getVideoTestimonialByToken(token);

  if (!testimonial) notFound();

  if (testimonial.videoUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-xl font-semibold text-slate-950">Already submitted</h1>
          <p className="mt-2 text-sm text-slate-600">This link has already been used. Thank you for your testimonial!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-lg">
        {testimonial.location.publicProfile?.logoUrl && (
          <div className="mb-6 flex justify-center">
            <img src={testimonial.location.publicProfile.logoUrl} alt={testimonial.location.name} className="h-12 object-contain" />
          </div>
        )}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Share your experience</h1>
          <p className="mt-2 text-sm text-slate-600">Record a short video for <span className="font-semibold">{testimonial.location.name}</span>. Max 90 seconds.</p>
        </div>
        <VideoRecorder token={token} />
      </div>
    </div>
  );
}
