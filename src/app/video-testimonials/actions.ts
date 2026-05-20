"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLocationAccess, requireActiveMembership } from "@/lib/authz";

export async function generateVideoTestimonialLink(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");
  await requireLocationAccess(locationId);

  const { nanoid } = await import("nanoid");
  const token = nanoid(24);

  await prisma.videoTestimonial.create({
    data: { locationId, token },
  });

  revalidatePath("/video-testimonials");
  return token;
}

export async function approveVideoTestimonial(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  await prisma.videoTestimonial.update({
    where: { id },
    data: { status: "APPROVED", publishedAt: new Date() },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Testimonial+approved&tone=success");
}

export async function rejectVideoTestimonial(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  await prisma.videoTestimonial.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Testimonial+rejected&tone=info");
}

export async function deleteVideoTestimonial(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true, videoUrl: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  if (testimonial.videoUrl) {
    try {
      const { del } = await import("@vercel/blob");
      await del(testimonial.videoUrl);
    } catch {
      // ignore blob deletion errors
    }
  }

  await prisma.videoTestimonial.delete({ where: { id } });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Testimonial+deleted&tone=info");
}

export async function getVideoTestimonialsForOrg() {
  const membership = await requireActiveMembership();

  const locations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    select: { id: true },
  });

  const locationIds = locations.map((l) => l.id);

  return prisma.videoTestimonial.findMany({
    where: { locationId: { in: locationIds } },
    include: { location: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}
