"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateReviewWidgetToken } from "@/lib/review-widgets";
import { getPrimaryOrganization } from "@/lib/google-oauth";
import { requireOrganizationAccess } from "@/lib/authz";

export async function createReviewWidget(formData: FormData) {
  const organization = await getPrimaryOrganization();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Reviews Widget";

  if (!organization?.id) {
    throw new Error("Organization is required");
  }

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireOrganizationAccess(organization.id);

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      googleLocationName: true,
      name: true,
    },
  });

  if (!location) {
    throw new Error("Location not found for this organization");
  }

  if (!location.googleLocationName) {
    redirect(`/widgets?flash=${encodeURIComponent(`Map ${location.name} to Google before creating a widget`)}&tone=error`);
  }

  const reviewCount = await prisma.review.count({
    where: {
      locationId: location.id,
      source: "GOOGLE",
      status: "PUBLISHED",
    },
  });

  if (reviewCount === 0) {
    redirect(`/widgets?flash=${encodeURIComponent(`Sync Google reviews for ${location.name} before creating a widget`)}&tone=error`);
  }

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId: organization.id,
      locationId,
      name,
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widget.id}`);
}

export async function updateReviewWidget(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();

  if (!widgetId) {
    throw new Error("Widget is required");
  }

  const existing = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new Error("Widget not found");
  }

  await requireOrganizationAccess(existing.organizationId);

  await prisma.reviewWidget.update({
    where: { id: widgetId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      layout: String(formData.get("layout") ?? "grid"),
      theme: String(formData.get("theme") ?? "light"),
      sort: String(formData.get("sort") ?? "newest"),
      minRating: Number(formData.get("minRating") ?? 1),
      pageSize: Number(formData.get("pageSize") ?? 12),
      isActive: String(formData.get("isActive") ?? "") === "on",
      showHeader: String(formData.get("showHeader") ?? "") === "on",
      showRating: String(formData.get("showRating") ?? "") === "on",
      showReviewerName: String(formData.get("showReviewerName") ?? "") === "on",
      showDate: String(formData.get("showDate") ?? "") === "on",
      showWriteReview: String(formData.get("showWriteReview") ?? "") === "on",
      showResponses: String(formData.get("showResponses") ?? "") === "on",
    },
  });

  redirect(`/widgets/${widgetId}?flash=Widget+updated&tone=success`);
}

export async function regenerateReviewWidgetToken(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();

  if (!widgetId) {
    throw new Error("Widget is required");
  }

  const existing = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new Error("Widget not found");
  }

  await requireOrganizationAccess(existing.organizationId);

  await prisma.reviewWidget.update({
    where: { id: widgetId },
    data: {
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widgetId}?flash=Embed+token+regenerated&tone=success`);
}
