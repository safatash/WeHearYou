import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as {
          token?: string;
        };

        if (!payload.token) throw new Error("Token is required");

        const testimonial = await prisma.videoTestimonial.findUnique({
          where: { token: payload.token },
          select: { id: true, videoUrl: true },
        });

        if (!testimonial) throw new Error("Invalid or expired link");
        if (testimonial.videoUrl) throw new Error("This link has already been used");

        // Store the testimonial token in tokenPayload so the /complete endpoint can look it up
        return {
          allowedContentTypes: ["video/webm", "video/mp4", "video/quicktime"],
          maximumSizeInBytes: 150 * 1024 * 1024,
          tokenPayload: payload.token,
        };
      },
      // No onUploadCompleted — Vercel Blob will respond to the PUT immediately
      // without waiting for a callback. The client calls /complete after upload.
      onUploadCompleted: async () => { /* intentionally empty */ },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
