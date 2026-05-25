import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const MAX_DURATION_SECONDS = 90;
const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = String(formData.get("token") ?? "").trim();
    const videoFile = formData.get("video");
    const submitterName = String(formData.get("submitterName") ?? "").trim() || null;
    const submitterEmail = String(formData.get("submitterEmail") ?? "").trim() || null;
    const durationSeconds = parseInt(String(formData.get("durationSeconds") ?? "0"), 10) || null;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!(videoFile instanceof File)) {
      return NextResponse.json({ error: "Video file is required" }, { status: 400 });
    }

    if (videoFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Video file is too large (max 150MB)" }, { status: 400 });
    }

    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Unsupported video format" }, { status: 400 });
    }

    if (durationSeconds && durationSeconds > MAX_DURATION_SECONDS) {
      return NextResponse.json({ error: `Video must be ${MAX_DURATION_SECONDS} seconds or shorter` }, { status: 400 });
    }

    const testimonial = await prisma.videoTestimonial.findUnique({
      where: { token },
      select: { id: true, videoUrl: true, locationId: true },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    if (testimonial.videoUrl) {
      return NextResponse.json({ error: "This link has already been used" }, { status: 409 });
    }

    const extension = videoFile.type === "video/mp4" || videoFile.type === "video/quicktime" ? "mp4" : "webm";
    const filename = `video-testimonials/${testimonial.locationId}/${testimonial.id}.${extension}`;

    const blob = await put(filename, videoFile, { access: "public", contentType: videoFile.type, token: process.env.BLOB_Public_READ_WRITE_TOKEN });

    await prisma.videoTestimonial.update({
      where: { id: testimonial.id },
      data: {
        videoUrl: blob.url,
        mimeType: videoFile.type,
        durationSeconds: durationSeconds ?? null,
        submitterName,
        submitterEmail,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video testimonial upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
