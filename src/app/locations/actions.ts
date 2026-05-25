"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ReviewSource, ReviewStatus } from "@prisma/client";

export type FunnelBuilderActionState = {
  success: boolean;
  error?: string;
};
import { buildGoogleOAuthUrl, fetchGoogleBusinessLocations, fetchGoogleLocationReviews, getValidGoogleAccessToken, normalizeGoogleStarRating } from "@/lib/google-oauth";
import { buildBulkGoogleSyncRedirect, buildRetryGoogleSyncRedirect } from "@/lib/google-batch-sync-actions";
import { buildLocationDetailSyncSuccessPath } from "@/lib/google-sync-action-paths";
import {
  buildIntegrationErrorParams,
  buildIntegrationSingleSyncSuccessParams,
  buildLocationSyncErrorParams,
  buildLocationSyncSuccessParams,
} from "@/lib/google-sync-redirects";
import { hasGoogleReviewChanged } from "@/lib/google-review-sync";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { requireLocationAccess, requireOrganizationAccess, requireTeamManagement } from "@/lib/authz";
import { scrapeYelpBusiness, extractYelpSlug } from "@/lib/yelp-scraper";

function formatGoogleWeekdayDescriptions(weekdayDescriptions?: string[] | null) {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) {
    return null;
  }

  return weekdayDescriptions.join("\n");
}

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function firstNonEmptyFormValue(formData: FormData, name: string) {
  for (const value of formData.getAll(name)) {
    const normalized = normalize(value);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function redirectToNewLocationError(message: string): never {
  redirect(`/locations/new?error=${encodeURIComponent(message)}`);
}

function redirectToLocationSettingsError(locationId: string, message: string): never {
  redirect(`/locations/${locationId}?flash=${encodeURIComponent(message)}&tone=error`);
}

async function requireGoogleConnectionForOrganization(googleConnectionId: string, organizationId: string) {
  const connection = await prisma.googleAccountConnection.findFirst({
    where: {
      id: googleConnectionId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    throw new Error("Google connection not found for this organization");
  }

  return connection;
}

const MAX_LOCATION_IMAGE_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

async function saveUploadedLocationImage(file: File | null, locationId: string, imageKind: "logo" | "hero") {
  if (!file || file.size === 0) {
    return null;
  }

  const allowedTypes =
    imageKind === "logo"
      ? new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])
      : new Set(["image/png", "image/jpeg", "image/webp"]);

  if (!allowedTypes.has(file.type)) {
    throw new Error(imageKind === "logo" ? "Logo must be a PNG, JPG, WEBP, or SVG file." : "Cover image must be a PNG, JPG, or WEBP file.");
  }

  if (file.size > MAX_LOCATION_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error("Image must be smaller than 20MB.");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "png";
  const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : "png";
  const filename = `uploads/${imageKind}s/${locationId}-${Date.now()}.${safeExtension}`;

  const { put } = await import("@vercel/blob");
  const blob = await put(filename, file, { access: "public", contentType: file.type, token: process.env.BLOB_Public_READ_WRITE_TOKEN });

  return blob.url;
}

function slugifyLocationName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function createUniqueLocationSlug(organizationId: string, name: string, excludeLocationId?: string) {
  const baseSlug = slugifyLocationName(name) || "location";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.location.findUnique({ where: { organizationId_slug: { organizationId, slug } }, select: { id: true } });

    if (!existing || existing.id === excludeLocationId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function persistConnectionBatchSyncResult({
  googleConnectionId,
  status,
  message,
  syncedCount,
  failedCount,
  failedNames,
  createdCount,
  updatedCount,
  skippedCount,
  totalCount,
}: {
  googleConnectionId: string;
  status: "success" | "partial" | "error";
  message: string | null;
  syncedCount: number;
  failedCount: number;
  failedNames: string[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCount: number;
}) {
  await prisma.googleAccountConnection.update({
    where: { id: googleConnectionId },
    data: {
      lastBatchSyncStatus: status,
      lastBatchSyncMessage: message,
      lastBatchSyncedCount: syncedCount,
      lastBatchFailedCount: failedCount,
      lastBatchFailedNames: failedNames.length > 0 ? failedNames.join("|") : null,
      lastBatchImportedCount: createdCount,
      lastBatchUpdatedCount: updatedCount,
      lastBatchSkippedCount: skippedCount,
      lastBatchFetchedCount: totalCount,
      lastBatchSyncAt: new Date(),
    },
  });
}

async function performGoogleReviewSync(locationId: string) {
  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      googleConnection: true,
    },
  });

  if (!location?.googleConnection || !location.googleLocationName) {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        lastSyncStatus: "error",
        lastSyncMessage: "Connect and map a Google Business Profile location before syncing reviews",
        lastSyncSkippedCount: null,
        lastSyncAt: new Date(),
      },
    });

    throw new Error("Connect and map a Google Business Profile location before syncing reviews");
  }

  let googleReviews;
  let googleLocationDetails:
    | {
        accountResourceName?: string;
        metadata?: { mapsUri?: string };
        regularHours?: { weekdayDescriptions?: string[] };
      }
    | undefined;

  try {
    const accessToken = await getValidGoogleAccessToken({
      id: location.googleConnection.id,
      accessToken: location.googleConnection.accessToken,
      refreshToken: location.googleConnection.refreshToken,
      expiresAt: location.googleConnection.expiresAt,
      scope: location.googleConnection.scope,
      tokenType: location.googleConnection.tokenType,
    });

    const googleLocations = await fetchGoogleBusinessLocations(accessToken);
    googleLocationDetails = googleLocations.find((googleLocation) => googleLocation.name === location.googleLocationName);
    const googleReviewLocationName = googleLocationDetails?.accountResourceName
      ? `${googleLocationDetails.accountResourceName}/${location.googleLocationName}`
      : location.googleLocationName;

    googleReviews = await fetchGoogleLocationReviews({
      accessToken,
      googleLocationName: googleReviewLocationName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";

    await prisma.location.update({
      where: { id: location.id },
      data: {
        lastSyncStatus: "error",
        lastSyncMessage: message,
        lastSyncSkippedCount: null,
        lastSyncAt: new Date(),
      },
    });

    throw error;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const review of googleReviews) {
    if (!review.reviewId) {
      continue;
    }

    const reviewedAt = review.updateTime ? new Date(review.updateTime) : review.createTime ? new Date(review.createTime) : null;

    const normalizedReviewerName = review.reviewer?.displayName?.trim() || "Google reviewer";
    const normalizedReviewerPhotoUrl = review.reviewer?.profilePhotoUrl?.trim() || null;
    const normalizedRating = normalizeGoogleStarRating(review.starRating);
    const normalizedBody = review.comment?.trim() || "No written review provided.";
    const normalizedSourceReviewUrl = review.reviewUrl?.trim() || null;
    const normalizedSourceReplyText = review.reviewReply?.comment?.trim() || null;
    const sourceUpdatedAt = review.updateTime ? new Date(review.updateTime) : review.createTime ? new Date(review.createTime) : null;

    const existingReview = await prisma.review.findFirst({
      where: {
        locationId: location.id,
        externalId: review.reviewId,
        source: ReviewSource.GOOGLE,
      },
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        body: true,
        status: true,
        reviewedAt: true,
        sourceUpdatedAt: true,
      },
    });

    if (existingReview) {
      const changed = hasGoogleReviewChanged(existingReview, {
        reviewerName: normalizedReviewerName,
        rating: normalizedRating,
        body: normalizedBody,
        reviewedAt,
        sourceUpdatedAt,
      });

      if (changed) {
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            reviewerName: normalizedReviewerName,
            reviewerPhotoUrl: normalizedReviewerPhotoUrl,
            sourceReviewUrl: normalizedSourceReviewUrl,
            sourceReplyText: normalizedSourceReplyText,
            rating: normalizedRating,
            body: normalizedBody,
            status: ReviewStatus.PUBLISHED,
            reviewedAt,
            publishedExternally: true,
            sourceUpdatedAt,
            lastImportedAt: new Date(),
          },
        });
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    } else {
      await prisma.review.create({
        data: {
          locationId: location.id,
          source: ReviewSource.GOOGLE,
          externalId: review.reviewId,
          reviewerName: normalizedReviewerName,
          reviewerPhotoUrl: normalizedReviewerPhotoUrl,
          sourceReviewUrl: normalizedSourceReviewUrl,
          sourceReplyText: normalizedSourceReplyText,
          rating: normalizedRating,
          status: ReviewStatus.PUBLISHED,
          body: normalizedBody,
          reviewedAt,
          publishedExternally: true,
          sourceUpdatedAt,
          lastImportedAt: new Date(),
        },
      });
      createdCount += 1;
    }
  }

  const publishedReviews = await prisma.review.findMany({
    where: {
      locationId: location.id,
      source: ReviewSource.GOOGLE,
      status: ReviewStatus.PUBLISHED,
    },
    select: {
      rating: true,
    },
  });

  const avgRating = publishedReviews.length
    ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / publishedReviews.length
    : null;

  await prisma.location.update({
    where: { id: location.id },
    data: {
      avgRating,
      lastSyncStatus: "success",
      lastSyncMessage: null,
      lastSyncImportedCount: createdCount,
      lastSyncUpdatedCount: updatedCount,
      lastSyncSkippedCount: skippedCount,
      lastSyncFetchedCount: googleReviews.length,
      lastSyncAt: new Date(),
      publicProfile: {
        upsert: {
          update: {
            googleMapsUrl: googleLocationDetails?.metadata?.mapsUri ?? undefined,
            googleHours: formatGoogleWeekdayDescriptions(googleLocationDetails?.regularHours?.weekdayDescriptions) ?? undefined,
          },
          create: {
            googleMapsUrl: googleLocationDetails?.metadata?.mapsUri ?? null,
            googleHours: formatGoogleWeekdayDescriptions(googleLocationDetails?.regularHours?.weekdayDescriptions),
          },
        },
      },
    },
  });

  await prisma.googleAccountConnection.update({
    where: { id: location.googleConnectionId! },
    data: {
      lastSyncedAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/integrations");
  revalidatePath(`/locations/${location.id}`);
  revalidatePath(`/b/${location.slug}`);

  return {
    location,
    createdCount,
    updatedCount,
    skippedCount,
    totalCount: googleReviews.length,
  };
}

export async function syncAllGoogleReviewsForConnection(formData: FormData) {
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();

  if (!googleConnectionId) {
    throw new Error("Google connection is required");
  }

  const membership = await requireTeamManagement();
  await requireGoogleConnectionForOrganization(googleConnectionId, membership.organizationId);

  try {
    const locations = await prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        googleConnectionId,
        googleLocationName: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (locations.length === 0) {
      throw new Error("No mapped Google locations are ready to sync");
    }

    const results = [];
    const failedLocationNames: string[] = [];

    for (const location of locations) {
      try {
        const result = await performGoogleReviewSync(location.id);
        results.push(result);
      } catch {
        const failedLocation = await prisma.location.findUnique({
          where: { id: location.id },
          select: { name: true },
        });
        failedLocationNames.push(failedLocation?.name ?? "Unknown location");
      }
    }

    const outcome = buildBulkGoogleSyncRedirect({
      results,
      failedLocationNames,
    });

    await persistConnectionBatchSyncResult({
      googleConnectionId,
      status: outcome.status,
      message: outcome.message,
      syncedCount: outcome.totals.syncedLocations,
      failedCount: outcome.totals.failedLocations,
      failedNames: outcome.totals.failedLocationNames,
      createdCount: outcome.totals.createdCount,
      updatedCount: outcome.totals.updatedCount,
      skippedCount: outcome.totals.skippedCount,
      totalCount: outcome.totals.totalCount,
    });

    redirect(outcome.redirectPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk Google review sync failed";
    await persistConnectionBatchSyncResult({
      googleConnectionId,
      status: "error",
      message,
      syncedCount: 0,
      failedCount: 0,
      failedNames: [],
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
    });
    const params = buildIntegrationErrorParams("bulk-sync-error", message);

    redirect(`/integrations?${params.toString()}`);
  }
}

export async function createLocation(formData: FormData) {
  const mode = String(formData.get("mode") ?? "manual").trim();
  const membership = await requireTeamManagement();
  await requireOrganizationAccess(membership.organizationId);

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { id: true },
  });

  if (!organization) {
    throw new Error("No organization found for current membership");
  }

  const status = "Launching";

  if (mode === "google") {
    const googleLocationPayload = firstNonEmptyFormValue(formData, "googleLocationPayload");
    const googleConnectionId = normalize(formData.get("googleConnectionId"));

    if (!googleLocationPayload) {
      redirectToNewLocationError("Choose a Google business from search results or use manual entry below.");
    }

    const parsed = JSON.parse(googleLocationPayload) as {
      name?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      addressLine1?: string;
      addressLine2?: string;
      googleLocationId?: string;
      googleLocationName?: string;
      googlePlaceId?: string;
      reviewLink?: string;
      mapsUri?: string;
      weekdayDescriptions?: string[];
    };

    const name = normalize(parsed.name ?? null);
    const city = normalize(parsed.city ?? null);
    const state = normalize(parsed.state ?? null);

    const derivedGoogleLocationId = normalize(parsed.googleLocationId ?? null);
    const derivedGoogleLocationName = normalize(parsed.googleLocationName ?? null);
    const derivedPlaceId = normalize(parsed.googlePlaceId ?? null);
    const derivedReviewLink = normalize(parsed.reviewLink ?? null) ?? buildGoogleWriteReviewLink(parsed.googlePlaceId);
    const hasMappedGoogleLocation = Boolean(googleConnectionId && derivedGoogleLocationId && derivedGoogleLocationName);

    if (googleConnectionId) {
      await requireGoogleConnectionForOrganization(googleConnectionId, organization.id);
    }

    if (!name || !city || !state) {
      redirectToNewLocationError("Selected Google business is missing required location details. Use manual entry below or choose a different result.");
    }

    const slug = await createUniqueLocationSlug(organization.id, name);

    const location = await prisma.location.create({
      data: {
        organizationId: organization.id,
        googleConnectionId,
        name,
        slug,
        city,
        state,
        status,
        reviewLink: derivedReviewLink,
        googleLocationId: hasMappedGoogleLocation ? derivedGoogleLocationId : null,
        googlePlaceId: derivedPlaceId,
        googleLocationName: hasMappedGoogleLocation ? derivedGoogleLocationName : null,
        googleConnectedAt: hasMappedGoogleLocation ? new Date() : null,
        publicProfile: {
          create: {
            addressLine1: normalize(parsed.addressLine1 ?? null),
            addressLine2: normalize(parsed.addressLine2 ?? null),
            postalCode: normalize(parsed.postalCode ?? null),
            googleMapsUrl: normalize(parsed.mapsUri ?? null),
            googleHours: formatGoogleWeekdayDescriptions(parsed.weekdayDescriptions),
            showReviews: true,
            showTestimonials: true,
            showMap: true,
            showHours: false,
            schemaEnabled: true,
          },
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/locations");
    revalidatePath("/integrations");
    revalidatePath("/settings");
    redirect(`/locations/${location.id}`);
  }

  const name = normalize(formData.get("name"));
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));
  const reviewLink = normalize(formData.get("reviewLink"));
  const addressLine1 = normalize(formData.get("addressLine1"));
  const addressLine2 = normalize(formData.get("addressLine2"));
  const postalCode = normalize(formData.get("postalCode"));

  if (!name || !city || !state || !addressLine1) {
    redirectToNewLocationError("Name, street address, city, and state are required for manual location creation.");
  }

  const slug = await createUniqueLocationSlug(organization.id, name);

  const location = await prisma.location.create({
    data: {
      organizationId: organization.id,
      name,
      slug,
      city,
      state,
      status,
      reviewLink,
      publicProfile: {
        create: {
          addressLine1,
          addressLine2,
          postalCode,
          showReviews: true,
          showTestimonials: true,
          showMap: true,
          showHours: false,
          schemaEnabled: true,
        },
      },
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/settings");
  redirect(`/locations/${location.id}`);
}

export async function upsertLocationPublicProfile(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      headline: String(formData.get("headline") ?? "").trim() || null,
      subheadline: String(formData.get("subheadline") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
      addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
      postalCode: String(formData.get("postalCode") ?? "").trim() || null,
      bookingUrl: String(formData.get("bookingUrl") ?? "").trim() || null,
      ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
      ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      heroImageUrl: String(formData.get("heroImageUrl") ?? "").trim() || null,
      theme: String(formData.get("theme") ?? "").trim() || null,
      businessType: String(formData.get("businessType") ?? "").trim() || null,
      customDomain: String(formData.get("customDomain") ?? "").trim() || null,
      showReviews: formData.get("showReviews") === "on",
      showTestimonials: formData.get("showTestimonials") === "on",
      showMap: formData.get("showMap") === "on",
      showHours: formData.get("showHours") === "on",
      schemaEnabled: formData.get("schemaEnabled") === "on",
    },
    create: {
      locationId,
      headline: String(formData.get("headline") ?? "").trim() || null,
      subheadline: String(formData.get("subheadline") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
      addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
      postalCode: String(formData.get("postalCode") ?? "").trim() || null,
      bookingUrl: String(formData.get("bookingUrl") ?? "").trim() || null,
      ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
      ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      heroImageUrl: String(formData.get("heroImageUrl") ?? "").trim() || null,
      theme: String(formData.get("theme") ?? "").trim() || null,
      businessType: String(formData.get("businessType") ?? "").trim() || null,
      customDomain: String(formData.get("customDomain") ?? "").trim() || null,
      showReviews: formData.get("showReviews") === "on",
      showTestimonials: formData.get("showTestimonials") === "on",
      showMap: formData.get("showMap") === "on",
      showHours: formData.get("showHours") === "on",
      schemaEnabled: formData.get("schemaEnabled") === "on",
    },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath(`/locations/${locationId}`);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { slug: true },
  });

  if (location?.slug) {
    revalidatePath(`/b/${location.slug}`);
  }

  redirect(`/locations/${locationId}?flash=Mini-site+settings+saved&tone=success`);
}

export async function saveLocationSettings(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, organizationId: true, slug: true },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const uploadedLogo = formData.get("logoFile");
  let logoUrl = String(formData.get("existingLogoUrl") ?? "").trim() || null;

  const uploadedHero = formData.get("heroImageFile");
  let heroImageUrl = String(formData.get("existingHeroImageUrl") ?? "").trim() || null;

  if (!name || !city || !state) {
    throw new Error("Location name, city, and state are required");
  }

  try {
    if (uploadedLogo instanceof File && uploadedLogo.size > 0) {
      logoUrl = await saveUploadedLocationImage(uploadedLogo, locationId, "logo");
    }

    if (uploadedHero instanceof File && uploadedHero.size > 0) {
      heroImageUrl = await saveUploadedLocationImage(uploadedHero, `${locationId}-hero`, "hero");
    }
  } catch (error) {
    console.error("Location image upload failed:", error);
    const message = error instanceof Error ? error.message : "Image upload failed. Please try again.";
    redirectToLocationSettingsError(locationId, message);
  }

  const nextSlug = await createUniqueLocationSlug(location.organizationId, name, location.id);

  await prisma.location.update({
    where: { id: locationId },
    data: {
      name,
      managerName: String(formData.get("managerName") ?? "").trim() || null,
      city,
      state,
      status: String(formData.get("status") ?? "").trim() || "Active",
      reviewLink: String(formData.get("reviewLink") ?? "").trim() || null,
      slug: nextSlug,
      publicProfile: {
        upsert: {
          update: {
            headline: String(formData.get("headline") ?? "").trim() || null,
            subheadline: String(formData.get("subheadline") ?? "").trim() || null,
            phone: String(formData.get("phone") ?? "").trim() || null,
            email: String(formData.get("email") ?? "").trim() || null,
            addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
            addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
            postalCode: String(formData.get("postalCode") ?? "").trim() || null,
            bookingUrl: String(formData.get("bookingUrl") ?? "").trim() || null,
            ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
            ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
            facebookUrl: String(formData.get("facebookUrl") ?? "").trim() || null,
            xUrl: String(formData.get("xUrl") ?? "").trim() || null,
            instagramUrl: String(formData.get("instagramUrl") ?? "").trim() || null,
            linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
            youtubeUrl: String(formData.get("youtubeUrl") ?? "").trim() || null,
            tiktokUrl: String(formData.get("tiktokUrl") ?? "").trim() || null,
            logoUrl,
            heroImageUrl,
            theme: String(formData.get("theme") ?? "").trim() || null,
            businessType: String(formData.get("businessType") ?? "").trim() || null,
            customDomain: String(formData.get("customDomain") ?? "").trim() || null,
            showReviews: formData.get("showReviews") === "on",
            showTestimonials: formData.get("showTestimonials") === "on",
            showMap: formData.get("showMap") === "on",
            showHours: formData.get("showHours") === "on",
            schemaEnabled: formData.get("schemaEnabled") === "on",
          },
          create: {
            headline: String(formData.get("headline") ?? "").trim() || null,
            subheadline: String(formData.get("subheadline") ?? "").trim() || null,
            phone: String(formData.get("phone") ?? "").trim() || null,
            email: String(formData.get("email") ?? "").trim() || null,
            addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
            addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
            postalCode: String(formData.get("postalCode") ?? "").trim() || null,
            bookingUrl: String(formData.get("bookingUrl") ?? "").trim() || null,
            ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
            ctaUrl: String(formData.get("ctaUrl") ?? "").trim() || null,
            facebookUrl: String(formData.get("facebookUrl") ?? "").trim() || null,
            xUrl: String(formData.get("xUrl") ?? "").trim() || null,
            instagramUrl: String(formData.get("instagramUrl") ?? "").trim() || null,
            linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
            youtubeUrl: String(formData.get("youtubeUrl") ?? "").trim() || null,
            tiktokUrl: String(formData.get("tiktokUrl") ?? "").trim() || null,
            logoUrl,
            heroImageUrl,
            theme: String(formData.get("theme") ?? "").trim() || null,
            businessType: String(formData.get("businessType") ?? "").trim() || null,
            customDomain: String(formData.get("customDomain") ?? "").trim() || null,
            showReviews: formData.get("showReviews") === "on",
            showTestimonials: formData.get("showTestimonials") === "on",
            showMap: formData.get("showMap") === "on",
            showHours: formData.get("showHours") === "on",
            schemaEnabled: formData.get("schemaEnabled") === "on",
          },
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/settings");
  revalidatePath("/funnel-builder");
  revalidatePath("/funnel-preview");

  const updatedLocation = await prisma.location.findUnique({
    where: { id: locationId },
    select: { slug: true },
  });

  if (location.slug) {
    revalidatePath(`/b/${location.slug}`);
    revalidatePath(`/f/${location.slug}`);
    revalidatePath(`/f/${location.slug}/feedback`);
    revalidatePath(`/f/${location.slug}/thanks`);
  }

  if (updatedLocation?.slug && updatedLocation.slug !== location.slug) {
    revalidatePath(`/b/${updatedLocation.slug}`);
    revalidatePath(`/f/${updatedLocation.slug}`);
    revalidatePath(`/f/${updatedLocation.slug}/feedback`);
    revalidatePath(`/f/${updatedLocation.slug}/thanks`);
  }

  redirect(`/locations/${locationId}?flash=Location+settings+saved&tone=success`);
}

export async function saveFunnelBuilderSettings(
  _prevState: FunnelBuilderActionState,
  formData: FormData,
): Promise<FunnelBuilderActionState> {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    return {
      success: false,
      error: "Location is required",
    };
  }

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      slug: true,
      reviewLink: true,
    },
  });

  if (!location) {
    return {
      success: false,
      error: "Location not found",
    };
  }

  const funnelRatingStyle = String(formData.get("funnelRatingStyle") ?? "stars").trim() || "stars";

  if (!["stars", "faces", "thumbs"].includes(funnelRatingStyle)) {
    return {
      success: false,
      error: "Invalid segmentation style",
    };
  }

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      funnelRatingStyle,
      funnelPromptTitle: String(formData.get("funnelPromptTitle") ?? "").trim() || null,
      funnelPromptBody: String(formData.get("funnelPromptBody") ?? "").trim() || null,
      funnelPrivateTitle: String(formData.get("funnelPrivateTitle") ?? "").trim() || null,
      funnelPrivateBody: String(formData.get("funnelPrivateBody") ?? "").trim() || null,
      funnelPrivateSubmitLabel: String(formData.get("funnelPrivateSubmitLabel") ?? "").trim() || null,
      funnelThanksPublicTitle: String(formData.get("funnelThanksPublicTitle") ?? "").trim() || null,
      funnelThanksPublicBody: String(formData.get("funnelThanksPublicBody") ?? "").trim() || null,
      funnelThanksPrivateTitle: String(formData.get("funnelThanksPrivateTitle") ?? "").trim() || null,
      funnelThanksPrivateBody: String(formData.get("funnelThanksPrivateBody") ?? "").trim() || null,
      funnelReviewButtonLabel: String(formData.get("funnelReviewButtonLabel") ?? "").trim() || null,
    },
    create: {
      locationId,
      funnelRatingStyle,
      funnelPromptTitle: String(formData.get("funnelPromptTitle") ?? "").trim() || null,
      funnelPromptBody: String(formData.get("funnelPromptBody") ?? "").trim() || null,
      funnelPrivateTitle: String(formData.get("funnelPrivateTitle") ?? "").trim() || null,
      funnelPrivateBody: String(formData.get("funnelPrivateBody") ?? "").trim() || null,
      funnelPrivateSubmitLabel: String(formData.get("funnelPrivateSubmitLabel") ?? "").trim() || null,
      funnelThanksPublicTitle: String(formData.get("funnelThanksPublicTitle") ?? "").trim() || null,
      funnelThanksPublicBody: String(formData.get("funnelThanksPublicBody") ?? "").trim() || null,
      funnelThanksPrivateTitle: String(formData.get("funnelThanksPrivateTitle") ?? "").trim() || null,
      funnelThanksPrivateBody: String(formData.get("funnelThanksPrivateBody") ?? "").trim() || null,
      funnelReviewButtonLabel: String(formData.get("funnelReviewButtonLabel") ?? "").trim() || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/funnel-builder");
  revalidatePath("/funnel-preview");
  revalidatePath(`/f/${location.slug}`);
  revalidatePath(`/f/${location.slug}/feedback`);
  revalidatePath(`/f/${location.slug}/thanks`);
  revalidatePath(`/b/${location.slug}`);
  revalidatePath(`/locations/${locationId}`);

  return {
    success: true,
  };
}

export async function mapLocationToGoogle(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();
  const googleLocationPayload = String(formData.get("googleLocationPayload") ?? "").trim();

  if (!locationId || !googleConnectionId || !googleLocationPayload) {
    throw new Error("Location mapping requires a WeHearYou location, Google connection, and selected Google location");
  }

  const membership = await requireLocationAccess(locationId);
  await requireGoogleConnectionForOrganization(googleConnectionId, membership.organizationId);

  const parsed = JSON.parse(googleLocationPayload) as {
    googleLocationId: string;
    googleLocationName: string;
    googlePlaceId?: string;
    reviewLink?: string;
    mapsUri?: string;
    weekdayDescriptions?: string[];
  };

  await prisma.location.update({
    where: { id: locationId },
    data: {
      googleConnectionId,
      googleLocationId: parsed.googleLocationId,
      googlePlaceId: parsed.googlePlaceId || null,
      googleLocationName: parsed.googleLocationName,
      googleConnectedAt: new Date(),
      reviewLink: parsed.reviewLink || null,
      publicProfile: {
        upsert: {
          update: {
            googleMapsUrl: parsed.mapsUri || null,
            googleHours: formatGoogleWeekdayDescriptions(parsed.weekdayDescriptions) || null,
          },
          create: {
            googleMapsUrl: parsed.mapsUri || null,
            googleHours: formatGoogleWeekdayDescriptions(parsed.weekdayDescriptions),
          },
        },
      },
    },
  });

  revalidatePath("/integrations");
  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function refreshGoogleLocationDetails(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      googleConnection: true,
      publicProfile: true,
    },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  if (!location.googleConnection || !location.googleLocationName?.includes("/locations/")) {
    if (location.googlePlaceId) {
      const mapUrl = buildGoogleWriteReviewLink(location.googlePlaceId)?.replace("/local/writereview?placeid=", "/maps/place/?q=place_id:");

      await prisma.locationPublicProfile.upsert({
        where: { locationId },
        update: {
          googleMapsUrl: mapUrl,
        },
        create: {
          locationId,
          googleMapsUrl: mapUrl,
          showReviews: true,
          showTestimonials: true,
          showMap: true,
          showHours: false,
          schemaEnabled: true,
        },
      });

      revalidatePath(`/locations/${locationId}`);
      revalidatePath(`/b/${location.slug}`);
      redirect(`/locations/${locationId}?flash=Google+map+details+refreshed.+Hours+need+a+connected+Google+Business+Profile+mapping&tone=info`);
    }

    throw new Error("This location needs a connected Google Business Profile mapping before live Google details can refresh");
  }

  const accessToken = await getValidGoogleAccessToken({
    id: location.googleConnection.id,
    accessToken: location.googleConnection.accessToken,
    refreshToken: location.googleConnection.refreshToken,
    expiresAt: location.googleConnection.expiresAt,
    scope: location.googleConnection.scope,
    tokenType: location.googleConnection.tokenType,
  });

  const googleLocations = await fetchGoogleBusinessLocations(accessToken);
  const googleLocation = googleLocations.find((entry) => entry.name === location.googleLocationName);

  if (!googleLocation) {
    throw new Error("Mapped Google Business Profile location could not be found from the connected account");
  }

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      googleMapsUrl: googleLocation.metadata?.mapsUri ?? null,
      googleHours: formatGoogleWeekdayDescriptions(googleLocation.regularHours?.weekdayDescriptions),
    },
    create: {
      locationId,
      googleMapsUrl: googleLocation.metadata?.mapsUri ?? null,
      googleHours: formatGoogleWeekdayDescriptions(googleLocation.regularHours?.weekdayDescriptions),
      showReviews: true,
      showTestimonials: true,
      showMap: true,
      showHours: false,
      schemaEnabled: true,
    },
  });

  revalidatePath(`/locations/${locationId}`);
  revalidatePath(`/b/${location.slug}`);
  redirect(`/locations/${locationId}?flash=Google+location+details+refreshed&tone=success`);
}

export async function syncGoogleReviews(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  try {
    const result = await performGoogleReviewSync(locationId);
    redirect(buildLocationDetailSyncSuccessPath(result.location.id, result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";
    const params = buildLocationSyncErrorParams(message);

    redirect(`/locations/${locationId}?${params.toString()}`);
  }
}

export async function syncGoogleReviewsFromLocationsList(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  try {
    const result = await performGoogleReviewSync(locationId);
    const params = buildLocationSyncSuccessParams(result);

    redirect(`/locations?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";
    const params = buildLocationSyncErrorParams(message);

    redirect(`/locations?${params.toString()}`);
  }
}

export async function syncGoogleReviewsFromIntegrations(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  let redirectPath: string;

  try {
    const result = await performGoogleReviewSync(locationId);
    const params = buildIntegrationSingleSyncSuccessParams(result.location.name, result);

    redirectPath = `/integrations?${params.toString()}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";
    const params = buildIntegrationErrorParams("sync-error", message);

    redirectPath = `/integrations?${params.toString()}`;
  }

  redirect(redirectPath);
}

export async function refreshGoogleConnection(formData: FormData) {
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();

  if (!googleConnectionId) {
    throw new Error("Google connection is required");
  }

  const membership = await requireTeamManagement();

  const connection = await prisma.googleAccountConnection.findFirst({
    where: {
      id: googleConnectionId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      scope: true,
      tokenType: true,
    },
  });

  if (!connection) {
    throw new Error("Google connection not found");
  }

  redirect(buildGoogleOAuthUrl({ organizationId: membership.organizationId, connectionId: googleConnectionId }));
}

export async function updateLocation(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = normalize(formData.get("name"));

  await requireLocationAccess(locationId);
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));
  const status = normalize(formData.get("status"));
  const managerName = normalize(formData.get("managerName"));
  const reviewLink = normalize(formData.get("reviewLink"));

  if (!locationId) {
    throw new Error("Location is required");
  }

  if (!name || !city || !state || !status) {
    throw new Error("Name, city, state, and status are required");
  }

  const existingLocation = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      organizationId: true,
      slug: true,
      name: true,
      googlePlaceId: true,
    },
  });

  if (!existingLocation) {
    throw new Error("Location not found");
  }

  const nextSlug = name === existingLocation.name ? existingLocation.slug : await createUniqueLocationSlug(existingLocation.organizationId, name);
  const nextReviewLink = reviewLink ?? buildGoogleWriteReviewLink(existingLocation.googlePlaceId);

  await prisma.location.update({
    where: { id: locationId },
    data: {
      name,
      city,
      state,
      status,
      managerName,
      reviewLink: nextReviewLink,
      slug: nextSlug,
    },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/integrations");
  revalidatePath("/reviews");
  revalidatePath("/settings");
  revalidatePath(`/locations/${locationId}`);
  revalidatePath(`/b/${existingLocation.slug}`);
  revalidatePath(`/b/${nextSlug}`);

  redirect(`/locations/${locationId}`);
}

export async function deleteLocation(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  await prisma.location.delete({
    where: { id: locationId },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/integrations");
  revalidatePath("/reviews");
  revalidatePath("/settings");
  revalidatePath(`/b/${location.slug}`);

  redirect(`/locations`);
}

export async function disconnectGoogleConnection(formData: FormData) {
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();

  if (!googleConnectionId) {
    throw new Error("Google connection is required");
  }

  const membership = await requireTeamManagement();

  const connection = await prisma.googleAccountConnection.findFirst({
    where: {
      id: googleConnectionId,
      organizationId: membership.organizationId,
    },
    include: {
      locations: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!connection) {
    throw new Error("Google connection not found");
  }

  await prisma.$transaction([
    prisma.location.updateMany({
      where: {
        organizationId: membership.organizationId,
        googleConnectionId,
      },
      data: {
        googleConnectionId: null,
        googleLocationId: null,
        googlePlaceId: null,
        googleLocationName: null,
        googleConnectedAt: null,
        lastSyncStatus: null,
        lastSyncMessage: null,
        lastSyncImportedCount: null,
        lastSyncUpdatedCount: null,
        lastSyncSkippedCount: null,
        lastSyncFetchedCount: null,
        lastSyncAt: null,
      },
    }),
    prisma.googleAccountConnection.delete({
      where: { id: googleConnectionId },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/integrations");
  revalidatePath("/locations");
  revalidatePath("/settings");

  for (const location of connection.locations) {
    revalidatePath(`/locations/${location.id}`);
    revalidatePath(`/b/${location.slug}`);
  }

  redirect(`/integrations?google=connected&message=${encodeURIComponent("Google connection disconnected")}`);
}

export async function retryFailedGoogleSyncs(formData: FormData) {
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();

  if (!googleConnectionId) {
    throw new Error("Google connection is required");
  }

  const membership = await requireTeamManagement();
  await requireGoogleConnectionForOrganization(googleConnectionId, membership.organizationId);

  try {
    const failedLocations = await prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        googleConnectionId,
        lastSyncStatus: "error",
        googleLocationName: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (failedLocations.length === 0) {
      throw new Error("No failed mapped locations are ready to retry");
    }

    const results = [];
    const failedLocationNames: string[] = [];

    for (const location of failedLocations) {
      try {
        const result = await performGoogleReviewSync(location.id);
        results.push(result);
      } catch {
        const failedLocation = await prisma.location.findUnique({
          where: { id: location.id },
          select: { name: true },
        });
        failedLocationNames.push(failedLocation?.name ?? "Unknown location");
      }
    }

    const outcome = buildRetryGoogleSyncRedirect({
      results,
      failedLocationNames,
    });

    await persistConnectionBatchSyncResult({
      googleConnectionId,
      status: outcome.status,
      message: outcome.message,
      syncedCount: outcome.totals.syncedLocations,
      failedCount: outcome.totals.failedLocations,
      failedNames: outcome.totals.failedLocationNames,
      createdCount: outcome.totals.createdCount,
      updatedCount: outcome.totals.updatedCount,
      skippedCount: outcome.totals.skippedCount,
      totalCount: outcome.totals.totalCount,
    });

    redirect(outcome.redirectPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry sync failed";
    await persistConnectionBatchSyncResult({
      googleConnectionId,
      status: "error",
      message,
      syncedCount: 0,
      failedCount: 0,
      failedNames: [],
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
    });
    const params = buildIntegrationErrorParams("retry-sync-error", message);

    redirect(`/integrations?${params.toString()}`);
  }
}

export async function connectYelp(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const rawUrl = String(formData.get("yelpUrl") ?? "").trim();

  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const slug = extractYelpSlug(rawUrl);
  if (!slug) {
    redirect(
      `/locations/${locationId}?flash=${encodeURIComponent(
        "Enter a valid Yelp business URL, e.g. https://www.yelp.com/biz/your-business"
      )}&tone=error`
    );
  }

  let result;
  try {
    result = await scrapeYelpBusiness(rawUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load Yelp page";
    redirect(`/locations/${locationId}?flash=${encodeURIComponent(msg)}&tone=error`);
  }

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpBusinessUrl: `https://www.yelp.com/biz/${result!.business.businessId}`,
      yelpBusinessName: result!.business.name,
      yelpBusinessId: result!.business.businessId,
      yelpConnectedAt: new Date(),
      yelpLastSyncStatus: null,
      yelpLastSyncAt: null,
      yelpLastSyncCount: null,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent(
      `Yelp connected: ${result!.business.name}. Click "Sync Yelp Reviews" to import reviews.`
    )}&tone=success`
  );
}

export async function syncYelpReviews(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, yelpBusinessUrl: true },
  });

  if (!location?.yelpBusinessUrl) {
    redirect(`/locations/${locationId}?flash=${encodeURIComponent("Connect a Yelp business first")}&tone=error`);
  }

  let result;
  try {
    result = await scrapeYelpBusiness(location.yelpBusinessUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yelp sync failed";
    await prisma.location.update({
      where: { id: locationId },
      data: { yelpLastSyncStatus: "error", yelpLastSyncAt: new Date() },
    });
    redirect(`/locations/${locationId}?flash=${encodeURIComponent(msg)}&tone=error`);
  }

  let imported = 0;
  let updated = 0;

  for (const review of result!.reviews) {
    const existing = await prisma.review.findFirst({
      where: { locationId, source: ReviewSource.YELP, externalId: review.externalId },
      select: { id: true, body: true, rating: true },
    });

    if (!existing) {
      await prisma.review.create({
        data: {
          locationId,
          source: ReviewSource.YELP,
          externalId: review.externalId,
          reviewerName: review.reviewerName,
          rating: review.rating,
          body: review.body,
          reviewedAt: review.reviewedAt,
          sourceReviewUrl: review.sourceReviewUrl,
          status: ReviewStatus.PUBLISHED,
        },
      });
      imported++;
    } else if (existing.body !== review.body || existing.rating !== review.rating) {
      await prisma.review.update({
        where: { id: existing.id },
        data: { body: review.body, rating: review.rating },
      });
      updated++;
    }
  }

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpLastSyncAt: new Date(),
      yelpLastSyncStatus: "success",
      yelpLastSyncCount: result!.reviews.length,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent(
      `Yelp sync complete: ${imported} new, ${updated} updated (${result!.reviews.length} total on page)`
    )}&tone=success`
  );
}

export async function disconnectYelp(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpBusinessUrl: null,
      yelpBusinessName: null,
      yelpBusinessId: null,
      yelpConnectedAt: null,
      yelpLastSyncAt: null,
      yelpLastSyncStatus: null,
      yelpLastSyncCount: null,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent("Yelp disconnected. Existing Yelp reviews are kept.")}&tone=success`
  );
}
