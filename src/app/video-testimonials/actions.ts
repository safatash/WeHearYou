"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLocationAccess, requireTeamManagement } from "@/lib/authz";

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
  const membership = await requireTeamManagement();

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

export async function sendVideoTestimonialRequest(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const channel = String(formData.get("channel") ?? "EMAIL").trim();

  if (!locationId) throw new Error("Location is required");
  if (!recipientName) throw new Error("Recipient name is required");
  if (channel === "EMAIL" && !recipientEmail) throw new Error("Email is required");
  if (channel === "SMS" && !recipientPhone) throw new Error("Phone is required");

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  if (!location) throw new Error("Location not found");

  const { nanoid } = await import("nanoid");
  const token = nanoid(24);

  await prisma.videoTestimonial.create({
    data: { locationId, token, submitterName: recipientName, submitterEmail: recipientEmail || null },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const recorderUrl = `${appUrl}/vt/${token}`;

  if (channel === "EMAIL" && recipientEmail) {
    const { sendVideoTestimonialRequestEmail } = await import("@/lib/email");
    await sendVideoTestimonialRequestEmail({
      to: recipientEmail,
      recipientName,
      locationName: location.name,
      recorderUrl,
    });
  }

  if (channel === "SMS" && recipientPhone) {
    const { sendVideoTestimonialRequestSMS } = await import("@/lib/sms");
    await sendVideoTestimonialRequestSMS({
      to: recipientPhone,
      recipientName,
      locationName: location.name,
      recorderUrl,
    });
  }

  revalidatePath("/video-testimonials");
  redirect(`/video-testimonials?flash=Video+testimonial+request+sent+to+${encodeURIComponent(recipientName)}&tone=success`);
}
