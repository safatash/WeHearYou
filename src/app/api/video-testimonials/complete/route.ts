import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

const ALLOWED_MIME_TYPES = new Set(["video/webm", "video/mp4", "video/quicktime"]);
const MAX_DURATION_SECONDS = 600;

function isValidBlobUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    // Hostname must be exactly <store-id>.public.blob.vercel-storage.com
    // with no extra labels (prevents subdomain tricks like evil.public.blob.vercel-storage.com.attacker.com)
    const suffix = ".public.blob.vercel-storage.com";
    if (!url.hostname.endsWith(suffix)) return false;
    const storeId = url.hostname.slice(0, -suffix.length);
    if (!storeId || storeId.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

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

    if (!isValidBlobUrl(videoUrl)) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported video type" }, { status: 400 });
    }

    if (durationSeconds != null && (durationSeconds < 0 || durationSeconds > MAX_DURATION_SECONDS)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const testimonial = await prisma.videoTestimonial.findUnique({
      where: { token },
      select: { id: true, videoUrl: true },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Atomic update: only succeeds if videoUrl is still null.
    // Prevents double-submission under concurrent requests (race condition).
    const result = await prisma.videoTestimonial.updateMany({
      where: { id: testimonial.id, videoUrl: null },
      data: {
        videoUrl,
        mimeType: mimeType ?? null,
        durationSeconds: durationSeconds ?? null,
        submitterName: submitterName ?? null,
        submitterEmail: submitterEmail ?? null,
        status: "PENDING",
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[video-complete]", error);
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }
}
