import { prisma } from "@/lib/prisma";
import { VideoTestimonialStatus } from "@prisma/client";
import { randomBytes } from "crypto";

export { VideoTestimonialStatus };

export async function getVideoTestimonialsForOrganization(organizationId: string) {
  return prisma.videoTestimonial.findMany({
    where: {
      location: { organizationId },
    },
    include: {
      location: {
        select: { id: true, name: true, city: true, state: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVideoTestimonialsForLocation(locationId: string) {
  return prisma.videoTestimonial.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVideoTestimonialByToken(token: string) {
  return prisma.videoTestimonial.findUnique({
    where: { token },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          publicProfile: {
            select: { logoUrl: true, headline: true },
          },
        },
      },
    },
  });
}

export async function getVideoTestimonialById(id: string) {
  return prisma.videoTestimonial.findUnique({
    where: { id },
    include: {
      location: { select: { id: true, name: true, organizationId: true } },
    },
  });
}

export async function createVideoTestimonialToken(locationId: string) {
  const token = randomBytes(16).toString("hex");
  return prisma.videoTestimonial.create({
    data: { locationId, token },
    select: { id: true, token: true },
  });
}

export async function submitVideoTestimonial({
  token,
  videoUrl,
  mimeType,
  durationSeconds,
  submitterName,
  submitterEmail,
}: {
  token: string;
  videoUrl: string;
  mimeType: string;
  durationSeconds?: number;
  submitterName?: string;
  submitterEmail?: string;
}) {
  return prisma.videoTestimonial.update({
    where: { token },
    data: {
      videoUrl,
      mimeType,
      durationSeconds: durationSeconds ?? null,
      submitterName: submitterName ?? null,
      submitterEmail: submitterEmail ?? null,
      status: VideoTestimonialStatus.PENDING,
    },
  });
}

export async function publishVideoTestimonial(id: string) {
  return prisma.videoTestimonial.update({
    where: { id },
    data: {
      status: VideoTestimonialStatus.APPROVED,
      publishedAt: new Date(),
    },
  });
}

export async function unpublishVideoTestimonial(id: string) {
  return prisma.videoTestimonial.update({
    where: { id },
    data: {
      status: VideoTestimonialStatus.PENDING,
      publishedAt: null,
    },
  });
}

export async function rejectVideoTestimonial(id: string) {
  return prisma.videoTestimonial.update({
    where: { id },
    data: { status: VideoTestimonialStatus.REJECTED },
  });
}

export async function deleteVideoTestimonial(id: string) {
  return prisma.videoTestimonial.delete({ where: { id } });
}
