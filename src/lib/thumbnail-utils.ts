import { ThumbnailSource } from "@prisma/client";

interface ThumbnailUrls {
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  videoUrl?: string | null;
  thumbnailSource: ThumbnailSource;
}

/**
 * Get the appropriate thumbnail URL based on admin's selection and availability.
 * Falls back gracefully if selected source is unavailable.
 * Cascade: selected source → other available source → default (first frame of video)
 */
export function getThumbnailUrl(thumbnails: ThumbnailUrls): string | null {
  const { customThumbnailUrl, capturedFrameUrl, videoUrl, thumbnailSource } =
    thumbnails;

  // Try the selected source first
  if (thumbnailSource === "CUSTOM" && customThumbnailUrl) {
    return customThumbnailUrl;
  }

  if (thumbnailSource === "CAPTURED" && capturedFrameUrl) {
    return capturedFrameUrl;
  }

  // Fallback 1: Try other available thumbnail sources
  if (customThumbnailUrl) {
    return customThumbnailUrl;
  }

  if (capturedFrameUrl) {
    return capturedFrameUrl;
  }

  // Fallback 2: Default to first frame of video (no separate URL needed, handled by <video> element)
  // Return null to signal "use default video thumbnail"
  return null;
}

/**
 * Get alt text for thumbnail based on available context
 */
export function getThumbnailAlt(submitterName?: string | null): string {
  if (submitterName) {
    return `Video testimonial from ${submitterName}`;
  }
  return "Video testimonial thumbnail";
}

/**
 * Check which thumbnail sources are available
 */
export function getAvailableThumbnailSources(thumbnails: ThumbnailUrls): ThumbnailSource[] {
  const available: ThumbnailSource[] = ["DEFAULT"];

  if (thumbnails.customThumbnailUrl) {
    available.push("CUSTOM");
  }

  if (thumbnails.capturedFrameUrl) {
    available.push("CAPTURED");
  }

  return available;
}
