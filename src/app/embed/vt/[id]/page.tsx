import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getThumbnailUrl, getThumbnailAlt } from "@/lib/thumbnail-utils";

export default async function EmbedVideoTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: {
      id: true,
      videoUrl: true,
      status: true,
      submitterName: true,
      customThumbnailUrl: true,
      capturedFrameUrl: true,
      thumbnailSource: true,
    },
  });

  if (!testimonial || !testimonial.videoUrl || testimonial.status !== "APPROVED") {
    notFound();
  }

  const thumbnailUrl = getThumbnailUrl({
    customThumbnailUrl: testimonial.customThumbnailUrl,
    capturedFrameUrl: testimonial.capturedFrameUrl,
    videoUrl: testimonial.videoUrl,
    thumbnailSource: testimonial.thumbnailSource,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={getThumbnailAlt(testimonial.submitterName)}
          className="max-h-screen w-full max-w-3xl object-cover"
        />
      ) : (
        <video
          src={testimonial.videoUrl}
          controls
          autoPlay={false}
          playsInline
          className="max-h-screen w-full max-w-3xl"
        />
      )}
    </div>
  );
}
