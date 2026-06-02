import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function EmbedVideoTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { id: true, videoUrl: true, status: true, submitterName: true },
  });

  if (!testimonial || !testimonial.videoUrl || testimonial.status !== "APPROVED") {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <video
        src={testimonial.videoUrl}
        controls
        autoPlay={false}
        playsInline
        className="max-h-screen w-full max-w-3xl"
      />
    </div>
  );
}
