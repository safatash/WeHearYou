"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLocationAccess, requireTeamManagement } from "@/lib/authz";
import { ThumbnailSource } from "@prisma/client";
import { validateImageFile, getImageContentType } from "@/lib/image-validation";
import { isValidFrameData, saveFrameAsImage } from "@/lib/frame-capture-server";
import { del } from "@vercel/blob";
import { randomBytes } from "crypto";

export async function generateVideoTestimonialLink(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");
  await requireLocationAccess(locationId);

  const token = randomBytes(18).toString("base64url");

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

export async function updateVideoTestimonialCaption(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  await prisma.videoTestimonial.update({
    where: { id },
    data: { caption: caption || null },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Caption+updated&tone=success");
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
  const prompt = String(formData.get("prompt") ?? "").trim() || null;

  if (!locationId) throw new Error("Location is required");
  if (!recipientName) throw new Error("Recipient name is required");
  if (channel === "EMAIL" && !recipientEmail) throw new Error("Email is required");
  if (channel === "SMS" && !recipientPhone) throw new Error("Phone is required");

  if (prompt && prompt.length > 300) {
    throw new Error("Recording prompt must be 300 characters or fewer.");
  }

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  if (!location) throw new Error("Location not found");

  const token = randomBytes(18).toString("base64url");

  await prisma.videoTestimonial.create({
    data: { locationId, token, submitterName: recipientName, submitterEmail: recipientEmail || null, prompt },
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
      prompt: prompt ?? undefined,
    });
  }

  if (channel === "SMS" && recipientPhone) {
    const { sendVideoTestimonialRequestSMS } = await import("@/lib/sms");
    await sendVideoTestimonialRequestSMS({
      to: recipientPhone,
      recipientName,
      locationName: location.name,
      recorderUrl,
      prompt: prompt ?? undefined,
    });
  }

  revalidatePath("/video-testimonials");
  redirect(`/video-testimonials?flash=Video+testimonial+request+sent+to+${encodeURIComponent(recipientName)}&tone=success`);
}

export async function uploadCustomThumbnail(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!id) throw new Error("ID is required");
  if (!file) throw new Error("File is required");

  // Validate image
  const validationErrors = validateImageFile(file, "thumbnail");
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map((e) => e.message).join("; "));
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true, customThumbnailUrl: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete old custom thumbnail if exists
  if (testimonial.customThumbnailUrl) {
    try {
      await del(testimonial.customThumbnailUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Upload new thumbnail
  const { put } = await import("@vercel/blob");
  const contentType = getImageContentType(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(
    `video-thumbnails/${id}-custom-${Date.now()}.webp`,
    buffer,
    {
      access: "public",
      contentType: "image/webp",
    }
  );

  // Update database: save URL and auto-select custom source
  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      customThumbnailUrl: blob.url,
      thumbnailSource: "CUSTOM",
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Custom+thumbnail+uploaded&tone=success");
}

export async function captureVideoFrame(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const frameData = String(formData.get("frameData") ?? "").trim();
  const timestamp = parseFloat(String(formData.get("timestamp") ?? "0"));

  if (!id) throw new Error("ID is required");
  if (!frameData) throw new Error("Frame data is required");
  if (!isValidFrameData(frameData)) {
    throw new Error("Invalid frame data format");
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true, capturedFrameUrl: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete old captured frame if exists
  if (testimonial.capturedFrameUrl) {
    try {
      await del(testimonial.capturedFrameUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Save captured frame
  const frameUrl = await saveFrameAsImage(frameData, "webp");

  // Update database: save URL, timestamp, and auto-select captured source
  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      capturedFrameUrl: frameUrl,
      capturedFrameTimestamp: isNaN(timestamp) ? null : timestamp,
      thumbnailSource: "CAPTURED",
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Frame+captured+successfully&tone=success");
}

export async function setThumbnailSource(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim().toUpperCase();

  if (!id) throw new Error("ID is required");
  if (!["DEFAULT", "CUSTOM", "CAPTURED"].includes(source)) {
    throw new Error("Invalid thumbnail source");
  }

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: { locationId: true },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  await prisma.videoTestimonial.update({
    where: { id },
    data: { thumbnailSource: source as ThumbnailSource },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Thumbnail+source+updated&tone=success");
}

export async function deleteCustomThumbnail(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: {
      locationId: true,
      customThumbnailUrl: true,
      thumbnailSource: true,
      capturedFrameUrl: true,
    },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete from blob storage
  if (testimonial.customThumbnailUrl) {
    try {
      await del(testimonial.customThumbnailUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Determine fallback source
  let fallbackSource = "DEFAULT" as ThumbnailSource;
  if (testimonial.capturedFrameUrl) {
    fallbackSource = "CAPTURED";
  }

  // Update database: clear URL and fall back if needed
  const newSource =
    testimonial.thumbnailSource === "CUSTOM" ? fallbackSource : testimonial.thumbnailSource;

  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      customThumbnailUrl: null,
      thumbnailSource: newSource,
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Custom+thumbnail+removed&tone=info");
}

export async function deleteCapturedFrame(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) throw new Error("ID is required");

  const testimonial = await prisma.videoTestimonial.findUnique({
    where: { id },
    select: {
      locationId: true,
      capturedFrameUrl: true,
      thumbnailSource: true,
      customThumbnailUrl: true,
    },
  });
  if (!testimonial) throw new Error("Not found");
  await requireLocationAccess(testimonial.locationId);

  // Delete from blob storage
  if (testimonial.capturedFrameUrl) {
    try {
      await del(testimonial.capturedFrameUrl);
    } catch {
      // Ignore deletion errors
    }
  }

  // Determine fallback source
  let fallbackSource = "DEFAULT" as ThumbnailSource;
  if (testimonial.customThumbnailUrl) {
    fallbackSource = "CUSTOM";
  }

  // Update database: clear URL and fall back if needed
  const newSource =
    testimonial.thumbnailSource === "CAPTURED" ? fallbackSource : testimonial.thumbnailSource;

  await prisma.videoTestimonial.update({
    where: { id },
    data: {
      capturedFrameUrl: null,
      capturedFrameTimestamp: null,
      thumbnailSource: newSource,
    },
  });

  revalidatePath("/video-testimonials");
  redirect("/video-testimonials?flash=Captured+frame+removed&tone=info");
}
