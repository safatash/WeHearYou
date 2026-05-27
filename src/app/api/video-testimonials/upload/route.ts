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
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as {
          token?: string;
          durationSeconds?: number;
          submitterName?: string;
          submitterEmail?: string;
        };

        if (!payload.token) throw new Error("Token is required");

        const testimonial = await prisma.videoTestimonial.findUnique({
          where: { token: payload.token },
          select: { id: true, videoUrl: true, locationId: true },
        });

        if (!testimonial) throw new Error("Invalid or expired link");
        if (testimonial.videoUrl) throw new Error("This link has already been used");

        return {
          allowedContentTypes: ["video/webm", "video/mp4", "video/quicktime"],
          maximumSizeInBytes: 150 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            testimonialId: testimonial.id,
            durationSeconds: payload.durationSeconds ?? null,
            submitterName: payload.submitterName ?? null,
            submitterEmail: payload.submitterEmail ?? null,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as {
          testimonialId: string;
          durationSeconds: number | null;
          submitterName: string | null;
          submitterEmail: string | null;
        };

        await prisma.videoTestimonial.update({
          where: { id: payload.testimonialId },
          data: {
            videoUrl: blob.url,
            mimeType: blob.contentType,
            durationSeconds: payload.durationSeconds,
            submitterName: payload.submitterName,
            submitterEmail: payload.submitterEmail,
            status: "PENDING",
          },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
