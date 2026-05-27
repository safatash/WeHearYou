import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, videoUrl, mimeType, durationSeconds, submitterName, submitterEmail } =
      (await request.json()) as {
        token: string;
        videoUrl: string;
        mimeType?: string;
        durationSeconds?: number | null;
        submitterName?: string | null;
        submitterEmail?: string | null;
      };

    if (!token || !videoUrl) {
      return NextResponse.json({ error: "token and videoUrl are required" }, { status: 400 });
    }

    // Sanity-check: the URL must be a Vercel Blob URL
    if (!videoUrl.includes("blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    const testimonial = await prisma.videoTestimonial.findUnique({
      where: { token },
      select: { id: true, videoUrl: true },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (testimonial.videoUrl) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    await prisma.videoTestimonial.update({
      where: { id: testimonial.id },
      data: {
        videoUrl,
        mimeType: mimeType ?? null,
        durationSeconds: durationSeconds ?? null,
        submitterName: submitterName ?? null,
        submitterEmail: submitterEmail ?? null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[video-complete]", error);
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }
}
